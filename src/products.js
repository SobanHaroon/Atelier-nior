export const editions=[{id:"carbon",name:"Carbon",subtitle:"An exercise in restraint.",color:"#191b1e",accent:"#ff3f35",label:"01 / CARBON",title:"THE CARBON SHELL",price:880},{id:"chalk",name:"Chalk",subtitle:"Precision in its purest form.",color:"#e1dfd4",accent:"#b61620",label:"02 / CHALK",title:"THE CHALK SHELL",price:880},{id:"crimson",name:"Crimson",subtitle:"Impossible to ignore.",color:"#720d16",accent:"#ff3f35",label:"03 / CRIMSON",title:"THE CRIMSON SHELL",price:920}];
export { catalog as products, categories, MAX_QUANTITY } from "../shared/catalog.js";
export const money=i=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(i);

export const cents = value => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value / 100);
