import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { logoutSession, readSession, requireAdmin, requireUser, setSession } from "@/lib/auth";
import { supabaseRest } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/security";
import { ACTIVATION_FEE, LIPA_BUSINESS, LIPA_NUMBER } from "@/lib/session";
import { people } from "@/data/people";

const T = "dolaway";
const table = (name: string) => `${T}_${name}`;

const registrationSchema = z.object({
  name: z.string().trim().min(3).max(80),
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,30}$/),
  email: z.string().trim().email().max(120),
  phone: z.string().trim().regex(/^\d{9,15}$/),
  country: z.string().trim().max(80).default("Tanzania"),
  password: z.string().min(6).max(100),
});

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("255")) return digits;
  if (digits.startsWith("0")) return `255${digits.slice(1)}`;
  return digits.length === 9 ? `255${digits}` : digits;
}

export const registerUser = createServerFn({ method: "POST" }).validator(registrationSchema).handler(async ({ data }) => {
  const email = data.email.toLowerCase();
  const username = data.username.toLowerCase();
  const phone = normalizePhone(data.phone);
  const [u,e,p] = await Promise.all([
    supabaseRest<any[]>(table("users"), { query: { select:"id", username:`eq.${username}`, limit:1 }}),
    supabaseRest<any[]>(table("users"), { query: { select:"id", email:`eq.${email}`, limit:1 }}),
    supabaseRest<any[]>(table("users"), { query: { select:"id", phone:`eq.${phone}`, limit:1 }}),
  ]);
  if (u.length) throw new Error("USERNAME_EXISTS");
  if (e.length || p.length) throw new Error("EMAIL_OR_PHONE_EXISTS");
  const {hash,salt}=await hashPassword(data.password);
  const created=await supabaseRest<any[]>(table("users"),{method:"POST",body:{
    name:data.name,username,email,phone,country:data.country||"Tanzania",password_hash:hash,password_salt:salt,status:"pending",role:"user",balance:0,withdrawn:0
  }});
  const user=created[0]; if(!user?.id) throw new Error("REGISTRATION_FAILED");
  await setSession({userId:String(user.id),role:"user"});
  return {id:String(user.id),status:"pending",activationFee:ACTIVATION_FEE};
});

export const loginUser = createServerFn({method:"POST"}).validator(z.object({username:z.string().trim().toLowerCase().min(3).max(80),password:z.string().min(1)})).handler(async({data})=>{
  const rows=await supabaseRest<any[]>(table("users"),{query:{select:"id,password_hash,password_salt,status,role",or:`(username.eq.${data.username},email.eq.${data.username})`,limit:1}});
  const user=rows[0];
  if(user && user.role==="user" && !["banned","deactivated","rejected"].includes(String(user.status)) && await verifyPassword(data.password,String(user.password_hash),String(user.password_salt))){
    await setSession({userId:String(user.id),role:"user"}); return {status:String(user.status)};
  }
  // Legacy DolaWay accounts created with Supabase Auth can still sign in and are
  // copied into the independent DolaWay account table on first successful login.
  try {
    const base=(process.env["SUPABASE_URL"]||"").replace(/\/$/,"");
    const key=process.env["SUPABASE_SERVICE_ROLE_KEY"];
    if(base && key){
      const lookup=await supabaseRest<any[]>(table("users"),{query:{select:"id,email,status",email:`eq.${data.username}`,limit:1}});
      const email=lookup[0]?.email || (data.username.includes("@")?data.username:null);
      if(email){
        const res=await fetch(`${base}/auth/v1/token?grant_type=password`,{method:"POST",headers:{apikey:key,"Content-Type":"application/json"},body:JSON.stringify({email,password:data.password})});
        if(res.ok){
          const auth=await res.json(); const meta=auth?.user?.user_metadata||{};
          const uid=auth?.user?.id; if(uid){
            const username=String(meta.username||email.split("@")[0]).toLowerCase().replace(/[^a-z0-9_]/g,"").slice(0,30)||("user_"+String(uid).slice(0,8));
            const hp=await hashPassword(data.password);
            const created=await supabaseRest<any[]>(table("users"),{method:"POST",body:{name:meta.full_name||meta.name||"DolaWay User",username,email,phone:meta.phone||"",country:meta.country||"Tanzania",password_hash:hp.hash,password_salt:hp.salt,status:"pending",role:"user",balance:0,withdrawn:0}});
            if(created[0]?.id){await setSession({userId:String(created[0].id),role:"user"});return{status:"pending"}}
          }
        }
      }
    }
  } catch {}
  throw new Error("INVALID_LOGIN");
});

export const getMe=createServerFn({method:"GET"}).handler(async()=>{
  const s=await readSession(); if(!s.userId||s.role!=="user") return {user:null};
  const rows=await supabaseRest<any[]>(table("users"),{query:{select:"id,name,username,email,phone,country,status,balance,withdrawn,created_at",id:`eq.${s.userId}`,limit:1}});
  return {user:rows[0]??null};
});

export const submitManualPayment=createServerFn({method:"POST"}).validator(z.object({phone:z.string().regex(/^\d{9,15}$/),amount:z.number().int().positive().optional()})).handler(async({data})=>{
  const userId=await requireUser(); const phone=normalizePhone(data.phone);
  await supabaseRest(table("payments"),{method:"POST",body:{user_id:userId,method:"lipa_namba",amount:data.amount??ACTIVATION_FEE,phone,status:"pending",external_id:LIPA_NUMBER,metadata:{business:LIPA_BUSINESS,lipa_number:LIPA_NUMBER}}});
  await supabaseRest(table("notifications"),{method:"POST",body:{user_id:userId,title:"Taarifa ya malipo imepokelewa",message:"Tumepokea taarifa yako ya Lipa Namba. Admin atakagua malipo yako.",type:"info"}});
  return {ok:true};
});

export const getNotifications=createServerFn({method:"GET"}).handler(async()=>{
  const userId=await requireUser(); const rows=await supabaseRest<any[]>(table("notifications"),{query:{select:"id,title,message,type,created_at",or:`(user_id.is.null,user_id.eq.${userId})`,order:"created_at.desc",limit:30}});
  return {notifications:rows};
});

export const dismissNotification=createServerFn({method:"POST"}).validator(z.object({notificationId:z.string().uuid()})).handler(async({data})=>{await requireUser();return{ok:true,notificationId:data.notificationId}});

export const getChatSession=createServerFn({method:"POST"}).validator(z.object({slug:z.string().min(1),payout:z.number().int().nonnegative()})).handler(async({data})=>{
  const uid=await requireUser();
  const u=await supabaseRest<any[]>(table("users"),{query:{select:"status",id:`eq.${uid}`,limit:1}});
  if(u[0]?.status!=="active") throw new Error("ACCOUNT_NOT_ACTIVE");
  const existing=await supabaseRest<any[]>(table("chat_sessions"),{query:{select:"*",user_id:`eq.${uid}`,foreigner_slug:`eq.${data.slug}`,status:"in.(open,completed)",limit:1}});
  if(existing[0]) return existing[0];
  const created=await supabaseRest<any[]>(table("chat_sessions"),{method:"POST",body:{user_id:uid,foreigner_slug:data.slug,payout:data.payout,message_count:0,status:"open"}});
  return created[0];
});

export const getChatMessages=createServerFn({method:"POST"}).validator(z.object({sessionId:z.string().uuid()})).handler(async({data})=>{
  const uid=await requireUser();
  const sessions=await supabaseRest<any[]>(table("chat_sessions"),{query:{select:"id",id:`eq.${data.sessionId}`,user_id:`eq.${uid}`,limit:1}});
  if(!sessions[0]) throw new Error("CHAT_NOT_FOUND");
  return supabaseRest<any[]>(table("chat_messages"),{query:{select:"id,sender_type,content,created_at",session_id:`eq.${data.sessionId}`,order:"created_at.asc"}});
});

export const sendChatMessage=createServerFn({method:"POST"}).validator(z.object({sessionId:z.string().uuid(),content:z.string().trim().min(1).max(2000),foreignerReply:z.string().trim().min(1).max(2000).optional()})).handler(async({data})=>{
  const uid=await requireUser();
  const srows=await supabaseRest<any[]>(table("chat_sessions"),{query:{select:"*",id:`eq.${data.sessionId}`,user_id:`eq.${uid}`,limit:1}});
  const s=srows[0]; if(!s) throw new Error("CHAT_NOT_FOUND");
  if(s.status!=="open" || Number(s.message_count)>=20) throw new Error("CHAT_CLOSED");
  await supabaseRest(table("chat_messages"),{method:"POST",body:{session_id:data.sessionId,sender_type:"user",content:data.content}});
  const count=Number(s.message_count)+1;
  await supabaseRest(table("chat_sessions"),{method:"PATCH",query:{id:`eq.${data.sessionId}`},body:{message_count:count}});
  if(data.foreignerReply && count<20) await supabaseRest(table("chat_messages"),{method:"POST",body:{session_id:data.sessionId,sender_type:"foreigner",content:data.foreignerReply}});
  return {messageCount:count,completed:count>=20};
});

export const completeChat=createServerFn({method:"POST"}).validator(z.object({sessionId:z.string().uuid(),payout:z.number().int().positive(),personName:z.string().min(1).max(100)})).handler(async({data})=>{
  const uid=await requireUser();
  const srows=await supabaseRest<any[]>(table("chat_sessions"),{query:{select:"*",id:`eq.${data.sessionId}`,user_id:`eq.${uid}`,limit:1}});
  const s=srows[0]; if(!s) throw new Error("CHAT_NOT_FOUND");
  if(s.status==="completed"){const u=await supabaseRest<any[]>(table("users"),{query:{select:"balance",id:`eq.${uid}`,limit:1}});return{ok:true,balance:Number(u[0]?.balance??0),alreadyCompleted:true}};
  if(Number(s.message_count)<20) throw new Error("CHAT_NOT_COMPLETE");
  const u=await supabaseRest<any[]>(table("users"),{query:{select:"status,balance",id:`eq.${uid}`,limit:1}});
  if(u[0]?.status!=="active") throw new Error("ACCOUNT_NOT_ACTIVE");
  const balance=Number(u[0]?.balance??0)+Number(data.payout);
  await supabaseRest(table("chat_sessions"),{method:"PATCH",query:{id:`eq.${data.sessionId}`},body:{status:"completed",completed_at:new Date().toISOString(),payout:data.payout}});
  await supabaseRest(table("users"),{method:"PATCH",query:{id:`eq.${uid}`},body:{balance}});
  await supabaseRest(table("notifications"),{method:"POST",body:{user_id:uid,title:"Malipo yameongezwa 💰",message:`Chat na ${data.personName} imekamilika. TZS ${Number(data.payout).toLocaleString()} imeongezwa kwenye salio.`,type:"success"}});
  return{ok:true,balance,alreadyCompleted:false};
});

export const requestWithdrawal=createServerFn({method:"POST"}).validator(z.object({amount:z.number().int().min(50000),phone:z.string().regex(/^\d{9,15}$/)})).handler(async({data})=>{
  const uid=await requireUser(); const u=(await supabaseRest<any[]>(table("users"),{query:{select:"balance,status",id:`eq.${uid}`,limit:1}}))[0];
  if(u?.status!=="active") throw new Error("ACCOUNT_NOT_ACTIVE"); if(Number(u.balance)<data.amount) throw new Error("INSUFFICIENT_BALANCE");
  await supabaseRest(table("withdrawals"),{method:"POST",body:{user_id:uid,amount:data.amount,phone:normalizePhone(data.phone),status:"pending"}});
  await supabaseRest(table("notifications"),{method:"POST",body:{user_id:uid,title:"Withdrawal imeombwa",message:`Ombi la TZS ${data.amount.toLocaleString()} limetumwa kwa admin.`,type:"info"}});
  return{ok:true};
});

export const logout=createServerFn({method:"POST"}).handler(async()=>{await logoutSession();return{ok:true}});

export const adminLogin=createServerFn({method:"POST"}).validator(z.object({email:z.string().email(),password:z.string().min(1)})).handler(async({data})=>{
  const rows=await supabaseRest<any[]>(table("users"),{query:{select:"id,email,password_hash,password_salt,status,role",email:`eq.${data.email.trim().toLowerCase()}`,limit:1}});
  const a=rows[0]; if(!a||a.role!=="admin"||a.status!=="active"||!(await verifyPassword(data.password,String(a.password_hash),String(a.password_salt)))) throw new Error("INVALID_ADMIN");
  await setSession({userId:String(a.id),role:"admin"}); return{ok:true};
});

export const getAdminData=createServerFn({method:"GET"}).handler(async()=>{
  await requireAdmin();
  const [users,payments,withdrawals,notifications]=await Promise.all([
    supabaseRest<any[]>(table("users"),{query:{select:"id,name,username,email,phone,country,status,role,balance,withdrawn,created_at",order:"created_at.desc",limit:500}}),
    supabaseRest<any[]>(table("payments"),{query:{select:"id,user_id,method,amount,phone,status,created_at,external_id",order:"created_at.desc",limit:500}}),
    supabaseRest<any[]>(table("withdrawals"),{query:{select:"id,user_id,amount,phone,status,created_at,reviewed_at",order:"created_at.desc",limit:500}}),
    supabaseRest<any[]>(table("notifications"),{query:{select:"id,user_id,title,message,type,created_at",order:"created_at.desc",limit:100}}),
  ]);
  return{users,payments,withdrawals,notifications};
});

export const adminSetUserStatus=createServerFn({method:"POST"}).validator(z.object({userId:z.string().uuid(),status:z.enum(["active","deactivated","banned","pending"])})).handler(async({data})=>{
  await requireAdmin(); await supabaseRest(table("users"),{method:"PATCH",query:{id:`eq.${data.userId}`},body:{status:data.status,...(data.status==="active"?{activated_at:new Date().toISOString()}: {})}});
  await supabaseRest(table("notifications"),{method:"POST",body:{user_id:data.userId,title:"Akaunti imesasishwa",message:`Status ya akaunti yako sasa ni ${data.status}.`,type:data.status==="active"?"success":"warning"}});
  return{ok:true};
});

export const adminReviewPayment=createServerFn({method:"POST"}).validator(z.object({paymentId:z.string().uuid(),action:z.enum(["approve","reject"])})).handler(async({data})=>{
  await requireAdmin(); const p=(await supabaseRest<any[]>(table("payments"),{query:{select:"id,user_id,status,amount",id:`eq.${data.paymentId}`,limit:1}}))[0];
  if(!p) throw new Error("PAYMENT_NOT_FOUND");
  await supabaseRest(table("payments"),{method:"PATCH",query:{id:`eq.${data.paymentId}`},body:{status:data.action==="approve"?"approved":"rejected",reviewed_at:new Date().toISOString(),confirmed_at:data.action==="approve"?new Date().toISOString():undefined}});
  if(data.action==="approve"){
    await supabaseRest(table("users"),{method:"PATCH",query:{id:`eq.${p.user_id}`},body:{status:"active",activated_at:new Date().toISOString()}});
    await supabaseRest(table("notifications"),{method:"POST",body:{user_id:String(p.user_id),title:"Akaunti imewashwa 🎉",message:"Malipo yako yamehakikiwa. Unaweza kuingia Dashboard.",type:"success"}});
  }
  return{ok:true};
});

export const adminReviewWithdrawal=createServerFn({method:"POST"}).validator(z.object({withdrawalId:z.string().uuid(),action:z.enum(["approve","reject"])})).handler(async({data})=>{
  await requireAdmin(); const w=(await supabaseRest<any[]>(table("withdrawals"),{query:{select:"id,user_id,amount,status",id:`eq.${data.withdrawalId}`,limit:1}}))[0]; if(!w) throw new Error("WITHDRAWAL_NOT_FOUND");
  if(data.action==="approve"){ const u=(await supabaseRest<any[]>(table("users"),{query:{select:"balance,withdrawn",id:`eq.${w.user_id}`,limit:1}}))[0]; if(Number(u?.balance)<Number(w.amount)) throw new Error("INSUFFICIENT_BALANCE"); await supabaseRest(table("users"),{method:"PATCH",query:{id:`eq.${w.user_id}`},body:{balance:Number(u.balance)-Number(w.amount),withdrawn:Number(u.withdrawn??0)+Number(w.amount)}});}
  await supabaseRest(table("withdrawals"),{method:"PATCH",query:{id:`eq.${data.withdrawalId}`},body:{status:data.action==="approve"?"approved":"rejected",reviewed_at:new Date().toISOString()}});
  return{ok:true};
});

export const adminSendNotification=createServerFn({method:"POST"}).validator(z.object({userId:z.string().uuid().nullable(),title:z.string().trim().min(2).max(120),message:z.string().trim().min(2).max(1000),type:z.enum(["info","success","warning","error"])})).handler(async({data})=>{
  await requireAdmin(); await supabaseRest(table("notifications"),{method:"POST",body:{user_id:data.userId,title:data.title,message:data.message,type:data.type}}); return{ok:true};
});
