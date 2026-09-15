import { getSession, isBackendConfigured, rest, rpc, signIn as backendSignIn, signOut as backendSignOut, signUp as backendSignUp } from "./supabase";

export const ACTIVATION_FEE = 14500;

export type Account = {id:string;fullName:string;username:string;email:string;phone:string;country:string;status:"pending"|"approved"|"rejected";role:"user"|"admin";balance:number;completed:string[]};
export type ChatMessage = {id:string;from:"them"|"me";text:string;created_at:string};
export type ChatSession = {id:string;foreigner_slug:string;payout:number;message_count:number;status:string};

export const emptyAccount:Account={id:"",fullName:"",username:"",email:"",phone:"",country:"",status:"pending",role:"user",balance:0,completed:[]};
const profileSelect="id,full_name,username,email,phone,country,status,role,balance";

function mapAccount(r:any):Account{return {id:r.id||"",fullName:r.full_name||"",username:r.username||"",email:r.email||"",phone:r.phone||"",country:r.country||"",status:r.status||"pending",role:r.role||"user",balance:Number(r.balance||0),completed:r.completed||[]};}

export async function loadAccount():Promise<Account>{
 if(!isBackendConfigured()||!getSession()) return emptyAccount;
 try{
  const id=getSession()?.user?.id;
  const rows=await rest<any[]>(`/rest/v1/profiles?select=${profileSelect}&id=eq.${id}&limit=1`);
  if(!rows[0]) return emptyAccount;
  const chats=await rest<any[]>(`/rest/v1/chat_sessions?select=foreigner_slug&user_id=eq.${id}&status=eq.completed`);
  return mapAccount({...rows[0],completed:chats.map(x=>x.foreigner_slug)});
 }catch{return emptyAccount;}
}

export async function registerAccount(input:any){
 const auth=await backendSignUp(input.email,input.password,{full_name:input.fullName,username:input.username,phone:input.phone,country:input.country});
 if(!auth.access_token) throw new Error("Akaunti imetengenezwa. Ingia ili kuendelea.");
 return loadAccount();
}

export async function signIn(usernameOrEmail:string,password:string){
 const email=usernameOrEmail.includes("@")?usernameOrEmail:await rpc<string|null>("get_login_email",{p_username:usernameOrEmail.trim()});
 if(!email) return null;
 await backendSignIn(email,password);
 return loadAccount();
}
export async function signOut(){await backendSignOut();}

export async function createPayment(phone:string){return rpc("create_activation_payment",{p_phone:phone});}
export async function getPendingPayment(){const r=await rest<any[]>(`/rest/v1/activation_payments?select=*&order=created_at.desc&limit=1`);return r[0]||null;}

export async function getForeigners(){return rpc<any[]>("get_foreigners",{});}
export async function getChatSession(slug:string){return rpc<ChatSession>("get_or_create_chat_session",{p_foreigner_slug:slug});}
export async function getChatMessages(id:string){const r=await rest<any[]>(`/rest/v1/chat_messages?select=id,sender_type,content,created_at&session_id=eq.${id}&order=created_at.asc`);return r.map(x=>({id:x.id,from:x.sender_type==="user"?"me":"them",text:x.content,created_at:x.created_at}));}
export async function sendChatMessage(id:string,text:string){return rpc("send_chat_message",{p_session_id:id,p_content:text});}
export async function createWithdrawal(amount:number,phone:string){return rpc("request_withdrawal",{p_amount:amount,p_phone:phone});}

export async function adminUsers(){return rest<any[]>(`/rest/v1/profiles?select=${profileSelect}&order=created_at.desc`);}
export async function adminPayments(){return rest<any[]>(`/rest/v1/activation_payments?select=*&order=created_at.desc`);}
export async function adminWithdrawals(){return rest<any[]>(`/rest/v1/withdrawals?select=*&order=created_at.desc`);}
export async function reviewPayment(id:string,status:"approved"|"rejected"){return rpc("review_activation_payment",{p_payment_id:id,p_status:status});}
export const approvePayment=(id:string)=>reviewPayment(id,"approved");
export const rejectPayment=(id:string)=>reviewPayment(id,"rejected");
export const fmt=(n:number)=>n.toLocaleString("en-US");
// ===== DolaWay compatibility exports =====

export const chatters = [
  {
    slug: "Isabella",
    name: "Isabella",
  },
  {
    slug: "Priya",
    name: "Priya",
  },
  {
    slug: "Felix",
    name: "Felix",
  },
  {
    slug: "Harriet",
    name: "Harriet",
  },
  {
    slug: "Bianca",
    name: "Bianca",
  },
  {
    slug: "Rosalie",
    name: "Rosalie",
  },
  {
    slug: "Rowan",
    name: "Rowan",
  },
  {
    slug: "Matilda",
    name: "Matilda",
  },
  {
    slug: "Thomas",
    name: "Thomas",
  },
];


export async function completeChat(sessionId: string) {
  return await rpc("send_chat_message", {
    p_session_id: sessionId,
    p_content: "completed"
  });
}