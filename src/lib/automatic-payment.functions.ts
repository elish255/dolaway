import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { supabaseRest } from "@/lib/db";
import { ACTIVATION_FEE } from "@/lib/session";

const T="dolaway";
const table=(n:string)=>`${T}_${n}`;
const BASE=()=> (process.env["PAYMENT_BASE_URL"] || "https://fimipay.com/api/v1/payment").replace(/\/$/,"");
function key(){ const k=process.env["PAYMENT_API_KEY"]; if(!k) throw new Error("Automatic payment API key haijawekwa kwenye environment variables."); return k; }
function headers(){ return {"Content-Type":"application/json",Accept:"application/json",Authorization:`Bearer ${key()}`}; }
function nested(x:any){ return x?.data && typeof x.data==="object" ? x.data : {}; }

async function activate(uid:string,paymentId:string,body:any){
  await supabaseRest(table("payments"),{method:"PATCH",query:{id:`eq.${paymentId}`},body:{status:"approved",confirmed_at:new Date().toISOString(),metadata:body}});
  await supabaseRest(table("users"),{method:"PATCH",query:{id:`eq.${uid}`},body:{status:"active",activated_at:new Date().toISOString()}});
  await supabaseRest(table("notifications"),{method:"POST",body:{user_id:uid,title:"Akaunti imefunguliwa 🎉",message:"Malipo yamefanikiwa. Akaunti yako iko active; karibu Dashboard.",type:"success"}});
}

export const createAutomaticPayment=createServerFn({method:"POST"}).validator(z.object({phone:z.string().regex(/^255\d{9}$/)})).handler(async({data})=>{
  const uid=await requireUser();
  const users=await supabaseRest<any[]>(table("users"),{query:{select:"id,name,email,status",id:`eq.${uid}`,limit:1}});
  const u=users[0]; if(!u) throw new Error("ACCOUNT_NOT_FOUND");
  if(u.status==="active") return {ok:true,orderId:"already-active"};
  const res=await fetch(`${BASE()}/create_order`,{method:"POST",headers:headers(),body:JSON.stringify({buyer_email:u.email,buyer_name:u.name,buyer_phone:data.phone,amount:ACTIVATION_FEE,currency:"TZS",payment_method:"mobile"})});
  const body=await res.json().catch(()=>null); const n=nested(body);
  if(!res.ok || String(body?.status??"").toLowerCase()!=="success") throw new Error(String(body?.message??"Automatic payment request failed."));
  const orderId=String(n?.order_id??body?.order_id??""); if(!orderId) throw new Error("PAYMENT_ORDER_MISSING");
  const created=await supabaseRest<any[]>(table("payments"),{method:"POST",body:{user_id:uid,method:"automatic",amount:ACTIVATION_FEE,phone:data.phone,external_id:orderId,status:"pending",metadata:body}});
  return {ok:true,orderId,paymentId:String(created[0]?.id??""),message:String(body?.message??"Payment request sent to your phone.")};
});

export const checkAutomaticPayment=createServerFn({method:"POST"}).validator(z.object({orderId:z.string().min(2).max(200)})).handler(async({data})=>{
  const uid=await requireUser();
  const payments=await supabaseRest<any[]>(table("payments"),{query:{select:"id,status",external_id:`eq.${data.orderId}`,user_id:`eq.${uid}`,limit:1}});
  const p=payments[0]; if(!p) throw new Error("PAYMENT_NOT_FOUND"); if(p.status==="approved") return{status:"SUCCESS"};
  const res=await fetch(`${BASE()}/order_status`,{method:"POST",headers:headers(),body:JSON.stringify({order_id:data.orderId})});
  const body=await res.json().catch(()=>null); if(!res.ok) throw new Error(String(body?.message??"Payment status unavailable."));
  const n=nested(body); const status=String(n?.payment_status??n?.status??body?.payment_status??body?.status??"PENDING").toUpperCase();
  if(status==="SUCCESS"){await activate(uid,String(p.id),body);return{status:"SUCCESS"};}
  if(["CANCELLED","USERCANCELLED","REJECTED","FAILED"].includes(status)){await supabaseRest(table("payments"),{method:"PATCH",query:{id:`eq.${p.id}`},body:{status:"rejected",metadata:body}});return{status:"FAILED"};}
  return{status};
});
