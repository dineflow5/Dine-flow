'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const peso=n=>'₱'+Number(n||0).toLocaleString('en-PH',{maximumFractionDigits:2});
const today=()=>{const d=new Date();
return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const menu=[
['Chicken Meal',150,'Meals','https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=700&q=85'],
['Burger Meal',120,'Meals','https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=700&q=85'],
['Pasta',130,'Meals','https://images.unsplash.com/photo-1626844131082-256783844137?auto=format&fit=crop&w=700&q=85'],
['Carbonara',140,'Meals','https://images.unsplash.com/photo-1612874742237-6526221588e3?auto=format&fit=crop&w=700&q=85'],
['Iced Coffee',90,'Drinks','https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=700&q=85'],
['Fries',80,'Snacks','https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=700&q=85'],
['Leche Flan',60,'Desserts','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSU01gp3iiaKJ6RAXE1bxqLPAD6JJEZBEw2V4og61STIg&s=10']
];
const defaultTables=Array.from({length:12},(_,i)=>({id:i+1,status:'available'}));
let tables=load('df_tables',defaultTables), users=load('df_users',[]), orders=load('df_orders',[]), reservations=load('df_reservations',[]), cart=[], currentTable=1, editingReservation=null, cancelingReservation=null, selectedCustomer='';
function load(key,fallback){try{const x=localStorage.getItem(key);
return x?JSON.parse(x):fallback}catch{return fallback}}
function persist(){for(const [k,v] of Object.entries({df_tables:tables,df_users:users,df_orders:orders,df_reservations:reservations,df_theme:document.documentElement.dataset.theme||'light'})){try{localStorage.setItem(k,JSON.stringify(v))}catch{}}}
function toast(message){const t=$('#toast');
t.textContent=message;
t.classList.add('show');
clearTimeout(toast.timer);
toast.timer=setTimeout(()=>t.classList.remove('show'),2200)}
function showPage(p){$$('.page').forEach(x=>x.classList.add('hidden'));
$('#'+p).classList.remove('hidden');
$('#title').textContent={dashboard:'Dashboard',tables:'Tables',detail:'Table Details',orders:'New Order',billing:'Billing',customers:'Customers',reservations:'Reservations',settings:'Settings'}[p]||'Dashboard';
$$('nav button[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===p||(p==='detail'&&b.dataset.page==='tables')));
if(p==='orders'){renderMenu();
renderOrderTableOptions()}if(p==='customers')renderCustomers();
if(p==='reservations')renderReservations();
if(p==='billing')renderBilling();
if(p==='tables'||p==='dashboard')renderTables();
$('main').scrollTop=0}
function counts(){$('#available').textContent=tables.filter(t=>t.status==='available').length;
$('#occupied').textContent=tables.filter(t=>t.status==='occupied').length;
$('#reserved').textContent=tables.filter(t=>t.status==='reserved').length;
$('#total').textContent=tables.length;
$('#orderMetric').textContent=orders.length;
$('#salesMetric').textContent=peso(orders.reduce((sum,o)=>sum+(o.paid?o.total:0),0))}
function tableCard(t){return `<button class="table" type="button" onclick="openTable(${t.id})"><b>T${String(t.id).padStart(2,'0')}</b><span class="${t.status}">${t.status}</span></button>`}
function renderTables(){counts();
$('#dashTables').innerHTML=tables.slice(0,6).map(tableCard).join('');
const q=($('#search')?.value||'').replace(/[^0-9]/g,'');
const f=$('#filter')?.value||'all';
$('#allTables').innerHTML=tables.filter(t=>(f==='all'||t.status===f)&&(!q||String(t.id).includes(q))).map(tableCard).join('');
persist()}
function tableOrders(id,unpaidOnly=false){return orders.filter(o=>o.tableId===id&&(!unpaidOnly||!o.paid))}
function totalFor(items){return items.reduce((sum,item)=>sum+item.price*item.qty,0)}
function openTable(id){currentTable=id;
const t=tables.find(x=>x.id===id);
if(!t)return;
const active=tableOrders(id,true);
$('#detailName').textContent=`Table ${String(id).padStart(2,'0')}`;
$('#detailStatus').textContent=t.status;
$('#detailStatus').className='pill '+t.status;
$('#detailCustomer').textContent=active.at(-1)?.customer||'No customer';
$('#detailGuests').textContent=active.at(-1)?.guests||'—';
$('#detailOrder').innerHTML=active.length?active.flatMap(o=>o.items.map(it=>`<div class="row"><span>${escapeHtml(it.name)} ×${it.qty}</span><b>${peso(it.price*it.qty)}</b></div>`)).join(''):'<p class="empty-note">No unpaid order for this table.</p>';
$('#detailTotal').textContent=peso(active.reduce((sum,o)=>sum+o.total,0));
showPage('detail')}
function renderMenu(list=menu){$('#menu').innerHTML=list.map(m=>{const i=menu.indexOf(m);return `<div class="food"><div class="food-img" style="background-image:url('${m[3]}')"></div><div class="food-info"><b>${m[0]}</b><span>${peso(m[1])}</span><button type="button" onclick="add(${i})">＋ Add</button></div></div>`}).join('')}
function add(i){const m=menu[i];
const found=cart.find(x=>x.name===m[0]);
if(found)found.qty++;
else cart.push({name:m[0],price:m[1],qty:1});
renderCart();
toast(m[0]+' added')}
function changeQty(i,delta){if(!cart[i])return;
cart[i].qty+=delta;
if(cart[i].qty<=0)cart.splice(i,1);
renderCart()}
function renderCart(){$('#cartCount').textContent=cart.reduce((n,x)=>n+x.qty,0)+' item'+(cart.reduce((n,x)=>n+x.qty,0)===1?'':'s');
$('#cartItems').innerHTML=cart.map((x,i)=>`<div class="cart-line"><span>${escapeHtml(x.name)}<small>${peso(x.price)} each</small></span><div class="qty-controls"><button type="button" aria-label="Decrease quantity" onclick="changeQty(${i},-1)">−</button><b>${x.qty}</b><button type="button" aria-label="Increase quantity" onclick="changeQty(${i},1)">＋</button><strong>${peso(x.price*x.qty)}</strong></div></div>`).join('')||'<p class="empty-note">No items added yet.</p>';
$('#cartTotal').textContent=peso(totalFor(cart))}
function renderOrderTableOptions(){const sel=$('#orderTableSelect');
const prior=Number(sel.value)||currentTable;
sel.innerHTML=tables.map(t=>`<option value="${t.id}">Table ${String(t.id).padStart(2,'0')} · ${t.status}</option>`).join('');
sel.value=String(tables.some(t=>t.id===prior)?prior:tables[0].id);
currentTable=Number(sel.value)}
function placeOrder(){const customer=$('#orderCustomer').value.trim(),tableId=Number($('#orderTableSelect').value);
if(!customer){toast('Enter the customer name first');
$('#orderCustomer').focus();
return}if(!cart.length){toast('Add at least one item first');
return}const items=cart.map(x=>({...x}));
const total=totalFor(items);
const order={id:'ORD-'+Date.now(),customer,tableId,items,total,createdAt:new Date().toISOString(),paid:false};
orders.push(order);
const t=tables.find(x=>x.id===tableId);
if(t){t.status='occupied';
t.customer=customer}currentTable=tableId;
cart=[];
renderCart();
persist();
renderTables();
toast(`Order placed — ${peso(total)}`);
openTable(tableId)}
function renderCustomers(){const q=($('#customerSearch').value||'').trim().toLowerCase();
const unique=[...new Set(orders.map(o=>o.customer))].filter(n=>n.toLowerCase().includes(q));
$('#customersList').innerHTML=unique.length?unique.map(name=>{const list=orders.filter(o=>o.customer===name);return `<button class="cust ${selectedCustomer===name?'active':''}" type="button" onclick="profile('${encodeURIComponent(name)}')"><b>${escapeHtml(name)}</b><span>${list.length} order${list.length===1?'':'s'} · Last total ${peso(list.at(-1).total)}</span><strong>›</strong></button>`}).join(''):'<div class="empty-card">No customer orders yet. Place an order to build customer history.</div>';
if(selectedCustomer&&unique.includes(selectedCustomer))renderProfile(selectedCustomer);
else if(unique.length){selectedCustomer=unique[0];
renderProfile(selectedCustomer)}else{$('#profile').innerHTML='<p class="empty-note">Customer details and order history will appear here after an order is placed.</p>'}}
function profile(encoded){selectedCustomer=decodeURIComponent(encoded);
renderCustomers()}
function renderProfile(name){const list=orders.filter(o=>o.customer===name);
$('#profile').innerHTML=`<h3>${escapeHtml(name)}</h3><button class="delete-customer" type="button" onclick="deleteCustomer()">Delete Customer</button><div class="profile-stats"><div><span>Total Orders</span><b>${list.length}</b></div><div><span>Total Spent</span><b>${peso(list.reduce((s,o)=>s+o.total,0))}</b></div></div><h4>Order History</h4>${list.slice().reverse().map(o=>`<div class="history-order"><div class="history-heading"><b>${escapeHtml(o.id)}</b><span>${new Date(o.createdAt).toLocaleString()}</span></div><div class="row"><span>Table</span><b>${String(o.tableId).padStart(2,'0')}</b></div>${o.items.map(it=>`<div class="row"><span>${escapeHtml(it.name)} ×${it.qty}</span><b>${peso(it.price*it.qty)}</b></div>`).join('')}<div class="total"><span>${o.paid?'Paid total':'Order total'}</span><b>${peso(o.total)}</b></div></div>`).join('')}`}
function deleteCustomer(){const name=selectedCustomer;if(!name)return;if(!confirm(`Delete customer "${name}" and all their order history? This cannot be undone.`))return;const removedOrders=orders.filter(o=>o.customer===name);orders=orders.filter(o=>o.customer!==name);tables.forEach(t=>{if(t.customer===name){const active=orders.filter(o=>o.tableId===t.id&&!o.paid);if(active.length){t.customer=active.at(-1).customer;t.status='occupied'}else{delete t.customer;t.status='available'}}});selectedCustomer='';persist();renderCustomers();renderTables();toast('Customer and order history deleted')}
function renderBilling(){const list=tableOrders(currentTable,true);
$('#billTable').textContent=`Table ${String(currentTable).padStart(2,'0')}`;
$('#billCustomer').textContent=list.at(-1)?`Customer: ${list.at(-1).customer}`:'No unpaid order for this table';
$('#billLines').innerHTML=list.length?list.flatMap(o=>o.items.map(it=>`<div class="row"><span>${escapeHtml(it.name)} ×${it.qty}</span><b>${peso(it.price*it.qty)}</b></div>`)).join(''):'<p class="empty-note">There are no unpaid orders for this table.</p>';
const total=list.reduce((s,o)=>s+o.total,0);
$('#billSubtotal').textContent=peso(total);
$('#billTotal').textContent=peso(total);
$('#payNow').disabled=!list.length}
function payNow(){const unpaid=tableOrders(currentTable,true);
if(!unpaid.length){toast('No unpaid order for this table');
return}const method=$('input[name="payment"]:checked')?.value||'Cash';
unpaid.forEach(o=>{o.paid=true;o.paymentMethod=method;o.paidAt=new Date().toISOString()});
const t=tables.find(x=>x.id===currentTable);
if(t){t.status='available';
delete t.customer}persist();
renderTables();
toast(`Payment confirmed · ${peso(unpaid.reduce((s,o)=>s+o.total,0))}`);
showPage('tables')}
function timeMinutes(s){const [h,m]=s.split(':').map(Number);
return h*60+m}
function reservationConflicts(date,time,tableId,ignoreId=null){const start=timeMinutes(time);
return reservations.some(r=>r.id!==ignoreId&&r.date===date&&r.tableId===tableId&&Math.abs(timeMinutes(r.time)-start)<120)}
function fillReservationTables(){const date=$('#resDate').value,time=$('#resTime').value;
const current=Number($('#resTable').value);
const choices=tables.filter(t=>t.status==='available'&&!reservationConflicts(date,time,t.id,editingReservation));
$('#resTable').innerHTML=choices.map(t=>`<option value="${t.id}">Table ${String(t.id).padStart(2,'0')} · available</option>`).join('');
if(choices.some(t=>t.id===current))$('#resTable').value=String(current);
$('#confirm').disabled=!choices.length;
$('#resError').textContent=choices.length?'':'No tables are available at that date and time.'}
function renderReservations(){const list=reservations.slice().sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
$('#resList').innerHTML=list.length?list.map(r=>`<div class="reservation"><strong>${new Date(`${r.date}T${r.time}`).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}</strong><div><h4>${escapeHtml(r.name)}</h4><p>${new Date(`${r.date}T12:00:00`).toLocaleDateString()} · Table ${String(r.tableId).padStart(2,'0')} · ${r.guests} guest${r.guests===1?'':'s'}</p><p class="reservation-status">${r.status||'Confirmed'}</p></div><div class="res-buttons"><button type="button" onclick="editReservation('${r.id}')">Edit</button><button type="button" class="cancel-res" onclick="cancelReservation('${r.id}')">Cancel</button></div></div>`).join(''):'<div class="empty-card">No reservations yet. Tap + to add one.</div>';
persist()}
function openReservationModal(id=null){editingReservation=id;
const r=id?reservations.find(x=>x.id===id):null;
$('#reservationForm').reset();
$('#modalTitle').textContent=r?'Edit Reservation':'New Reservation';
$('#modalIcon').textContent=r?'✎':'＋';
$('#confirm').textContent=r?'Save Changes':'Save Reservation';
$('#resName').value=r?.name||'';
$('#resDate').value=r?.date||today();
$('#resTime').value=r?.time||'18:00';
$('#resGuests').value=String(r?.guests||4);
$('#resError').textContent='';
$('#modal').classList.remove('hidden');
$('#modal').setAttribute('aria-hidden','false');
fillReservationTables();
if(r)$('#resTable').value=String(r.tableId);
$('#resName').focus()}
function editReservation(id){openReservationModal(id)}
function cancelReservation(id){const r=reservations.find(x=>x.id===id);
if(!r)return;
cancelingReservation=id;
editingReservation=null;
$('#reservationForm').classList.add('cancel-mode');
$('#reservationForm').querySelectorAll('input,select').forEach(el=>el.disabled=true);
$('#modalTitle').textContent='Cancel Reservation?';
$('#modalIcon').textContent='!';
$('#modalText').textContent=`Are you sure you want to cancel ${r.name}'s reservation for Table ${String(r.tableId).padStart(2,'0')} on ${r.date} at ${r.time}?`;
$('#confirm').textContent='Cancel Reservation';
$('#keep').textContent='Keep Reservation';
$('#modal').classList.remove('hidden');
$('#modal').setAttribute('aria-hidden','false')}
function closeModal(){$('#modal').classList.add('hidden');
$('#modal').setAttribute('aria-hidden','true');
$('#reservationForm').classList.remove('cancel-mode');
$('#reservationForm').querySelectorAll('input,select').forEach(el=>el.disabled=false);
editingReservation=null;
cancelingReservation=null}
function saveReservation(e){e.preventDefault();
if(cancelingReservation){const id=cancelingReservation;
reservations=reservations.filter(x=>x.id!==id);
closeModal();
persist();
renderReservations();
toast('Reservation cancelled');
return}const wasEditing=Boolean(editingReservation);
const name=$('#resName').value.trim(),date=$('#resDate').value,time=$('#resTime').value,guests=Number($('#resGuests').value),tableId=Number($('#resTable').value);
if(!name||!date||!time||!tableId){$('#resError').textContent='Complete all reservation fields.';
return}if(reservationConflicts(date,time,tableId,editingReservation)){$('#resError').textContent='That table is already reserved near this time. Choose another available table.';
fillReservationTables();
return}if(editingReservation){const r=reservations.find(x=>x.id===editingReservation);
Object.assign(r,{name,date,time,guests,tableId})}else reservations.push({id:'RES-'+Date.now(),name,date,time,guests,tableId,status:'Confirmed'});
closeModal();
renderReservations();
toast(wasEditing?'Reservation updated':'Reservation added')}
function setTheme(theme){document.documentElement.dataset.theme=theme;
$('#themeToggle').checked=theme==='dark';
persist()}
function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function handleAuth(e){
 e.preventDefault();
 const identity=$('#user').value.trim();
 const password=$('#pass').value;
 if(!identity||!password){
  $('#authMessage').textContent='Enter your username/email and password.';
  $('#authMessage').classList.add('error');
  return;
 }
 $('#login').classList.add('hidden');
 $('#app').classList.remove('hidden');
 $('#authMessage').textContent='';
 toast('Welcome to DineFlow');
 showPage('dashboard');
}
function init(){const theme=load('df_theme','light');document.documentElement.dataset.theme=theme;$('#themeToggle').checked=theme==='dark';$('#resDate').min=today();$('#resDate').value=today();$('#loginForm').addEventListener('submit',handleAuth);$$('[data-page]').forEach(b=>b.addEventListener('click',()=>showPage(b.dataset.page)));$('#bell').onclick=()=>toast('No new notifications');$('#search').addEventListener('input',renderTables);$('#filter').addEventListener('change',renderTables);$('#addTable').onclick=()=>{const id=tables.length?Math.max(...tables.map(t=>t.id))+1:1;tables.push({id,status:'available'});renderTables();toast('Table added')};$$('.tabs button').forEach(b=>b.addEventListener('click',()=>{$$('.tabs button').forEach(x=>x.classList.remove('active'));b.classList.add('active');const c=b.textContent.trim();renderMenu(c==='All'?menu:menu.filter(x=>x[2]===c))}));$('#orderTableSelect').addEventListener('change',()=>currentTable=Number($('#orderTableSelect').value));$('#place').onclick=placeOrder;$('#payNow').onclick=payNow;$('#newRes').onclick=()=>openReservationModal();$('#reservationForm').addEventListener('submit',saveReservation);$('#close').onclick=$('#keep').onclick=closeModal;$('#modal').addEventListener('click',e=>{if(e.target===$('#modal'))closeModal()});$('#resDate').addEventListener('change',fillReservationTables);$('#resTime').addEventListener('change',fillReservationTables);$('#resTable').addEventListener('change',()=>$('#resError').textContent='');$('#customerSearch').addEventListener('input',renderCustomers);$('#themeToggle').addEventListener('change',e=>{setTheme(e.target.checked?'dark':'light');toast(e.target.checked?'Dark mode enabled':'Light mode enabled')});$('#save').onclick=()=>{persist();toast('Settings saved')};$('#logout').onclick=()=>{$('#app').classList.add('hidden');$('#login').classList.remove('hidden');$('#pass').value='';toast('Logged out')};document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});renderTables();renderCart();renderReservations();}
init();
