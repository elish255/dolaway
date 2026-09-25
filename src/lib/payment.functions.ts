import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { supabaseRest } from "@/lib/db";

const CREATE_PATH = process.env.AUTO_PAYMENT_CREATE_PATH || "/create_order";
const STATUS_PATH = process.env.AUTO_PAYMENT_STATUS_PATH || "/order_status";
const BASE = (process.env.AUTO_PAYMENT_BASE_URL || "https://fimipay.com/api/v1/payment").replace(/\/$/, "");
const amount = () => Number(process.env.ACTIVATION_FEE || process.env.VITE_ACTIVATION_FEE || "14500");

function paymentHeaders(){ const key=process.env.PAYMENT_API_KEY; if(!key) throw new Error("AUTO_PAYMENT_NOT_CONFIGURED"); return {"Content-Type":"application/json",Accept:"application/json","User-Agent":"DolaWay/1.0",Authorization:`Bearer ${key}`}; }
function nested(body:Record<string,unknown>|null){return body?.data&&typeof body.data==="object"?(body.data as Record<string,unknown>):null;}
function normalizePhone(raw:string){const d=raw.replace(/\D/g,"");if(d.startsWith("255"))return d;if(d.startsWith("0"))return `255${d.slice(1)}`;return d.length===9?`255${d}`:d;}

export const createAutoPayment=createServerFn({method:"POST"}).validator(z.object({phone:z.string().min(9).max(15)})).handler(async({data})=>{
  const userId=await requireUser();
  const users=await supabaseRest<Array<Record<string,unknown>>>("dolaway_users",{query:{select:"id,name,email,phone,status",id:`eq.${userId}`,limit:1}});
  const user=users[0]; if(!user)throw new Error("ACCOUNT_NOT_FOUND"); if(user.status==="active")return{ok:true,orderId:"already-active"};
  const res=await fetch(`${BASE}${CREATE_PATH}`,{method:"POST",headers:paymentHeaders(),body:JSON.stringify({buyer_email:user.email,buyer_name:user.name,buyer_phone:normalizePhone(data.phone),amount:amount(),currency:"TZS",payment_method:"mobile"})});
  const body=(await res.json().catch(()=>null)) as Record<string,unknown>|null; const n=nested(body);
  if(!res.ok || String(body?.status??"").toLowerCase()!=="success") throw new Error("AUTO_PAYMENT_FAILED");
  const orderId=String(n?.order_id??body?.order_id??""); if(!orderId)throw new Error("AUTO_PAYMENT_NO_ORDER");
  await supabaseRest("dolaway_activation_payments",{method:"POST",body:{user_id:userId,method:"automatic",amount:amount(),phone:normalizePhone(data.phone),external_id:orderId,status:"pending",metadata:body}});
  return{ok:true,orderId,message:"Payment request initiated."};
});

export const checkAutoPayment=createServerFn({method:"POST"}).validator(z.object({orderId:z.string().min(2).max(200)})).handler(async({data})=>{
  const userId=await requireUser();
  const rows=await supabaseRest<Array<Record<string,unknown>>>("dolaway_activation_payments",{query:{select:"id,status",external_id:`eq.${data.orderId}`,user_id:`eq.${userId}`,limit:1}});
  const payment=rows[0];if(!payment)throw new Error("PAYMENT_NOT_FOUND");if(payment.status==="approved")return{status:"SUCCESS"};
  const res=await fetch(`${BASE}${STATUS_PATH}`,{method:"POST",headers:paymentHeaders(),body:JSON.stringify({order_id:data.orderId})});
  const body=(await res.json().catch(()=>null)) as Record<string,unknown>|null;if(!res.ok)throw new Error("AUTO_PAYMENT_STATUS_FAILED");
  const n=nested(body);const status=String(n?.payment_status??n?.status??body?.payment_status??body?.status??"PENDING").toUpperCase();
  if(status==="SUCCESS"){const now=new Date().toISOString();await supabaseRest("dolaway_activation_payments",{method:"PATCH",query:{id:`eq.${String(payment.id)}`},body:{status:"approved",confirmed_at:now,metadata:body}});await supabaseRest("dolaway_users",{method:"PATCH",query:{id:`eq.${userId}`},body:{status:"active",activated_at:now}});await supabaseRest("dolaway_notifications",{method:"POST",body:{user_id:userId,title:"Akaunti imefunguliwa 🎉",message:"Malipo yako yamefanikiwa. Akaunti yako iko active; karibu Dashboard.",type:"success"}});return{status:"SUCCESS"};}
  if(["CANCELLED","USERCANCELLED","REJECTED"].includes(status)){await supabaseRest("dolaway_activation_payments",{method:"PATCH",query:{id:`eq.${String(payment.id)}`},body:{status:"rejected",metadata:body}});return{status:"FAILED"};}
  return{status};
});
