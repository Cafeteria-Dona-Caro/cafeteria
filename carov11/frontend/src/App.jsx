import React, { useState, useEffect, useMemo } from 'react';
import { 
  Coffee, User, ChefHat, DollarSign, Settings, ShoppingCart, CheckCircle, Check, X, Wifi, WifiOff, 
  Plus, Trash2, Edit2, Save, RefreshCw, TrendingUp, ClipboardList, Utensils, Printer, 
  Minus, LogOut, Keypad, MapPin, Bike, ShoppingBag, FileText, Phone, Search, CreditCard, Banknote, GlassWater,
  FileCheck, FileWarning, Download
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp, query, writeBatch, increment } from 'firebase/firestore';
import { firebaseConfig } from './firebaseConfig';

// --- CONFIGURACIÓN ---
let db, auth, appId = 'cafecaro-centro';
try {
    if (firebaseConfig?.apiKey) {
        const app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
    }
} catch (e) { console.error(e); }

// --- CONSTANTES ---
const CATEGORIES = ["Todos", "Cafés calientes", "Tisanas", "Sodas", "Frappe", "Smoothies", "Chamoyadas", "Bebidas", "Postres", "Alimentos"];
const DRINK_CATS = ["Cafés calientes", "Tisanas", "Sodas", "Frappe", "Smoothies", "Chamoyadas", "Bebidas"];
const FOOD_CATS = ["Postres", "Alimentos"];
const ZONES = { salon: { id: 'salon', name: "Salón", tables: [1,2,3,4,5,6] }, terraza: { id: 'terraza', name: "Terraza", tables: [10,11,12,13,14] } };
const ROLES = {
    admin: { label: "Admin", icon: Settings, color: "text-purple-600", bg: "bg-purple-100" },
    cashier: { label: "Caja", icon: DollarSign, color: "text-green-600", bg: "bg-green-100" },
    waiter: { label: "Mesero", icon: User, color: "text-amber-600", bg: "bg-amber-100" },
    kitchen: { label: "Cocina", icon: ChefHat, color: "text-orange-600", bg: "bg-orange-100" },
    bar: { label: "Barra", icon: GlassWater, color: "text-blue-500", bg: "bg-blue-100" },
    driver: { label: "Repartidor", icon: Bike, color: "text-red-600", bg: "bg-red-100" },
};

// --- COMPONENTES UI ---
const Card = ({ children, className="" }) => <div className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${className}`}>{children}</div>;
const Button = ({ children, onClick, variant="primary", className="", disabled=false }) => {
    const v = { primary: "bg-amber-600 text-white", secondary: "bg-white border text-gray-700 hover:bg-gray-50", danger: "bg-red-50 text-red-600", success: "bg-green-600 text-white", ghost: "text-gray-500 hover:bg-gray-100" };
    return <button onClick={onClick} disabled={disabled} className={`px-4 py-2 rounded-lg font-medium transition-all active:scale-95 disabled:opacity-50 ${v[variant]} ${className}`}>{children}</button>;
};
const Modal = ({ isOpen, onClose, title, children, actions }) => {
    if (!isOpen) return null;
    return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col"><div className="p-4 border-b flex justify-between items-center"><h3 className="font-bold text-lg">{title}</h3><button onClick={onClose}><X size={20}/></button></div><div className="p-6 overflow-y-auto">{children}</div>{actions && <div className="p-4 bg-gray-50 border-t flex justify-end gap-2">{actions}</div>}</div></div>;
};
const PinPad = ({ onComplete, error }) => {
    const [p, setP] = useState("");
    const h = (n) => { if(p.length<4) { const np=p+n; setP(np); if(np.length===4) onComplete(np); }};
    return <div className="w-64 mx-auto"><div className="flex justify-center gap-4 mb-6">{[0,1,2,3].map(i=><div key={i} className={`w-4 h-4 rounded-full border-2 ${i<p.length?(error?"bg-red-500":"bg-amber-600"):"border-gray-300"}`}/>)}</div>{error&&<p className="text-red-500 text-center mb-4">{error}</p>}<div className="grid grid-cols-3 gap-4">{[1,2,3,4,5,6,7,8,9].map(n=><button key={n} onClick={()=>h(n.toString())} className="h-16 rounded-full bg-gray-50 text-xl font-bold">{n}</button>)}<button onClick={()=>{setP("");onComplete("")}} className="h-16 rounded-full text-red-500 font-bold">C</button><button onClick={()=>h("0")} className="h-16 rounded-full bg-gray-50 text-xl font-bold">0</button><button onClick={()=>setP(x=>x.slice(0,-1))} className="h-16 rounded-full text-gray-600"><Minus/></button></div></div>;
};

// --- VISTAS ---
const LoginView = ({ users, onLogin, online }) => {
    const [err, setErr] = useState("");
    const sub = (pin) => { const u = users.find(x => x.pin === pin && x.isActive); u ? onLogin(u) : (setErr("PIN Incorrecto"), setTimeout(()=>setErr(""),1000)); };
    return <div className="min-h-screen bg-amber-50 flex items-center justify-center p-4"><Card className="w-full max-w-md p-8 text-center"><div className="absolute top-4 right-4">{online?<div className="text-green-600 flex gap-1 text-xs"><Wifi size={12}/> Online</div>:<div className="text-red-600 flex gap-1 text-xs"><WifiOff size={12}/> Offline</div>}</div><div className="mx-auto w-20 h-20 bg-amber-600 rounded-full flex items-center justify-center text-white mb-6"><Coffee size={40}/></div><h1 className="text-2xl font-bold text-gray-900">Café Caro ERP</h1><p className="text-gray-500 mb-6">v11.0 Fiscal</p><PinPad onComplete={sub} error={err}/></Card></div>;
};

const WaiterView = ({ user, products, customers, onCreateOrder, onAddCustomer, orders, notify }) => {
    const [cat, setCat] = useState("Todos");
    const [cart, setCart] = useState([]);
    const [mode, setMode] = useState('dine_in');
    const [tab, setTab] = useState(null);
    const [zone, setZone] = useState('salon');
    const [cust, setCust] = useState(null);
    const [newC, setNewC] = useState(false);
    const [formC, setFormC] = useState({name:'', phone:'', address:'', rfc:''});
    const [search, setSearch] = useState("");

    const add = (p) => {
        const qty = cart.filter(i=>i.id===p.id).reduce((s,i)=>s+i.quantity,0);
        if(p.stock!==undefined && qty>=p.stock) return notify("Stock Bajo", `Solo quedan ${p.stock}`, "error");
        setCart(prev => {
            const idx = prev.findIndex(i => i.id===p.id && !i.notes);
            if(idx>=0) { const n=[...prev]; n[idx].quantity++; return n; }
            return [...prev, {...p, quantity:1, internalId: Date.now()+Math.random(), notes:''}];
        });
    };
    
    const send = async () => {
        if(mode==='dine_in' && !tab) return notify("Error", "Elige mesa", "error");
        if(mode!=='dine_in' && !cust && !formC.name) return notify("Error", "Elige cliente", "error");
        if(!cart.length) return notify("Error", "Carrito vacío", "error");
        
        const data = {
            items: cart, total: cart.reduce((s,i)=>s+(i.price*i.quantity),0), status: 'pending', waiter: user.name, type: mode,
            tableNumber: mode==='dine_in'?tab:null,
            customerName: mode==='dine_in'?`Mesa ${tab}`:(cust?.name || "Cliente"),
            customerId: cust?.id||null, deliveryAddress: cust?.address||null, deliveryPhone: cust?.phone||null,
            deliveryStatus: mode==='delivery'?'pending':null
        };
        const res = await onCreateOrder(data);
        if(res.success) { setCart([]); setTab(null); setCust(null); notify("Enviado", "Orden creada", "success"); }
    };

    return <div className="flex h-screen overflow-hidden">
        <div className="flex-1 bg-gray-100 flex flex-col">
            <div className="bg-white p-2 flex gap-2 overflow-x-auto shadow-sm">{CATEGORIES.map(c=><button key={c} onClick={()=>setCat(c)} className={`px-4 py-2 rounded-full text-sm ${cat===c?'bg-amber-600 text-white':'bg-gray-100'}`}>{c}</button>)}</div>
            <div className="p-4 overflow-y-auto grid grid-cols-3 gap-4">{products.filter(p=>p.isActive && (cat==="Todos"||p.category===cat)).map(p=><div key={p.id} onClick={()=>add(p)} className="bg-white p-4 rounded-xl shadow border cursor-pointer hover:shadow-md"><h3 className="font-bold">{p.name}</h3><div className="flex justify-between mt-2 text-sm"><span className="text-amber-600">${p.price}</span><span className="text-gray-400">Stock: {p.stock}</span></div></div>)}</div>
        </div>
        <div className="w-96 bg-white border-l flex flex-col z-20">
            <div className="grid grid-cols-3 border-b text-xs font-bold text-gray-500"><button onClick={()=>setMode('dine_in')} className={`py-3 ${mode==='dine_in'?'text-amber-600 border-b-2 border-amber-600':''}`}>Comedor</button><button onClick={()=>setMode('takeout')} className={`py-3 ${mode==='takeout'?'text-amber-600 border-b-2 border-amber-600':''}`}>Para Llevar</button><button onClick={()=>setMode('delivery')} className={`py-3 ${mode==='delivery'?'text-amber-600 border-b-2 border-amber-600':''}`}>Domicilio</button></div>
            <div className="p-4 bg-gray-50 border-b">
                {mode==='dine_in' && <><div className="flex gap-2 mb-2"><button onClick={()=>setZone('salon')} className={`flex-1 py-1 rounded text-xs ${zone==='salon'?'bg-white shadow':''}`}>Salón</button><button onClick={()=>setZone('terraza')} className={`flex-1 py-1 rounded text-xs ${zone==='terraza'?'bg-white shadow':''}`}>Terraza</button></div><div className="grid grid-cols-4 gap-2">{ZONES[zone].tables.map(t=><button key={t} onClick={()=>setTab(t)} className={`h-10 rounded font-bold border ${tab===t?'bg-amber-600 text-white':orders.some(o=>o.tableNumber===t && o.status!=='paid')?'bg-red-50 border-red-200 text-red-500':'bg-white'}`}>{t}</button>)}</div></>}
                {mode!=='dine_in' && <div>{!cust ? <div className="flex gap-2"><input className="flex-1 border rounded p-2 text-sm" placeholder="Buscar cliente..." value={search} onChange={e=>setSearch(e.target.value)}/><button onClick={()=>setNewC(true)} className="bg-green-600 text-white rounded p-2"><Plus size={16}/></button></div> : <div className="bg-blue-50 p-2 rounded relative"><button onClick={()=>setCust(null)} className="absolute top-1 right-1"><X size={14}/></button><p className="font-bold">{cust.name}</p><p className="text-xs">{cust.address}</p></div>}
                {!cust && <div className="mt-2 max-h-32 overflow-y-auto bg-white border rounded">{customers.filter(c=>c.name.toLowerCase().includes(search.toLowerCase())).map(c=><div key={c.id} onClick={()=>setCust(c)} className="p-2 hover:bg-gray-50 cursor-pointer text-sm font-bold">{c.name}</div>)}</div>}</div>}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">{cart.map(i=><div key={i.internalId} className="flex justify-between items-center bg-gray-50 p-2 rounded"><div className="text-sm"><p className="font-bold">{i.name}</p><p>${i.price} x {i.quantity}</p></div><button onClick={()=>setCart(prev=>prev.filter(x=>x.internalId!==i.internalId))} className="text-red-400"><Trash2 size={14}/></button></div>)}</div>
            <div className="p-4 border-t"><div className="flex justify-between font-bold text-xl mb-4"><span>Total</span><span>${cart.reduce((s,i)=>s+i.price*i.quantity,0)}</span></div><Button onClick={send} className="w-full py-3" disabled={!cart.length}>Confirmar</Button></div>
        </div>
        <Modal isOpen={newC} onClose={()=>setNewC(false)} title="Nuevo Cliente" actions={<Button onClick={async()=>{await onAddCustomer(formC); setNewC(false); notify("Listo","Cliente guardado","success")}}>Guardar</Button>}><div className="space-y-2"><input className="w-full border p-2 rounded" placeholder="Nombre" onChange={e=>setFormC({...formC, name:e.target.value})}/><input className="w-full border p-2 rounded" placeholder="Teléfono" onChange={e=>setFormC({...formC, phone:e.target.value})}/><input className="w-full border p-2 rounded" placeholder="Dirección" onChange={e=>setFormC({...formC, address:e.target.value})}/><input className="w-full border p-2 rounded" placeholder="RFC" onChange={e=>setFormC({...formC, rfc:e.target.value})}/></div></Modal>
    </div>;
};

const ProductionView = ({ orders, onUpdate, role }) => {
    const cats = role==='bar' ? DRINK_CATS : FOOD_CATS;
    const active = orders.filter(o=>['pending','cooking'].includes(o.status) && o.items.some(i=>cats.includes(i.category))).sort((a,b)=>(a.createdAt?.seconds||0)-(b.createdAt?.seconds||0));
    return <div className="p-6 bg-gray-100 min-h-screen"><h1 className="text-2xl font-bold mb-6 flex gap-2 items-center">{role==='bar'?<GlassWater/>:<ChefHat/>} Monitor {role==='bar'?'Barra':'Cocina'}</h1><div className="grid grid-cols-3 gap-4">{active.map(o=><Card key={o.id} className={`border-l-4 ${o.status==='pending'?'border-red-500':'border-amber-500'}`}><div className="p-3 border-b flex justify-between"><div><span className="text-xs font-bold uppercase text-gray-500">{o.type}</span><br/><span className="font-bold text-lg">{o.type==='dine_in'?`Mesa ${o.tableNumber}`:o.customerName}</span></div><span className="text-xs font-bold bg-gray-100 px-2 py-1 rounded h-fit">{o.status}</span></div><div className="p-3 space-y-1">{o.items.filter(i=>cats.includes(i.category)).map((i,x)=><div key={x} className="flex gap-2 text-sm border-b pb-1"><span className="font-bold w-6">{i.quantity}</span><span>{i.name} {i.notes&&<span className="text-xs text-amber-600 block">{i.notes}</span>}</span></div>)}</div><div className="p-3 border-t bg-gray-50 flex gap-2">{o.status==='pending'?<Button onClick={()=>onUpdate(o.id,{status:'cooking'})} className="w-full">Cocinar</Button>:<Button onClick={()=>onUpdate(o.id,{status:'ready'})} variant="success" className="w-full">Listo</Button>}</div></Card>)}</div></div>;
};

const CashierView = ({ orders, customers, onUpdate, modal, receipt, onAddCustomer }) => {
    const [tab, setTab] = useState('cashier');
    const [sel, setSel] = useState(null);
    const [inv, setInv] = useState(false); // Modal de Cobro
    const [fiscalMode, setFiscalMode] = useState(false); // Modal selección cliente fiscal
    const [fiscalCust, setFiscalCust] = useState(null);
    const [z, setZ] = useState(false);
    const [search, setSearch] = useState("");
    
    const pay = orders.filter(o=>o.status!=='paid').sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
    const del = orders.filter(o=>o.type==='delivery' && o.status!=='paid');
    
    const doPay = (m) => { 
        onUpdate(sel.id, {
            status:'paid', 
            paymentMethod:m, 
            invoiceRequired: !!fiscalCust, 
            invoiceData: fiscalCust ? { ...fiscalCust, status: 'pending' } : null 
        }); 
        setInv(false); setFiscalMode(false); setFiscalCust(null); 
    };

    const zData = useMemo(()=> { const p=orders.filter(o=>o.status==='paid'); const c=p.filter(x=>x.paymentMethod==='cash').reduce((s,i)=>s+i.total,0); const t=p.filter(x=>x.paymentMethod==='card').reduce((s,i)=>s+i.total,0); return {c,t,tot:c+t,cnt:p.length}; },[orders]);

    return <div className="h-screen flex flex-col bg-gray-100"><div className="bg-white p-4 flex justify-between border-b shadow-sm"><h1 className="text-xl font-bold flex gap-2"><DollarSign/> Caja</h1><div className="flex gap-2"><button onClick={()=>setTab('cashier')} className={`px-3 py-1 rounded ${tab==='cashier'?'bg-green-100 text-green-700':''}`}>Cobro</button><button onClick={()=>setTab('delivery')} className={`px-3 py-1 rounded ${tab==='delivery'?'bg-blue-100 text-blue-700':''}`}>Envíos</button><button onClick={()=>setZ(true)} className="px-3 py-1 rounded hover:bg-gray-100">Corte Z</button></div></div>
        <div className="p-6 flex-1 overflow-y-auto">{tab==='cashier' ? <Card><table className="w-full text-left text-sm"><thead className="bg-gray-50"><tr><th className="p-3">Orden</th><th className="p-3">Tipo</th><th className="p-3">Total</th><th className="p-3 text-right">Acción</th></tr></thead><tbody>{pay.map(o=><tr key={o.id} className="border-b"><td className="p-3 font-bold">{o.customerName}</td><td className="p-3"><span className="bg-gray-100 px-2 py-1 rounded text-xs uppercase">{o.type}</span></td><td className="p-3 font-mono font-bold">${o.total}</td><td className="p-3 text-right flex justify-end gap-2"><Button onClick={()=>receipt(o)} variant="secondary"><Printer size={16}/></Button><Button onClick={()=>{setSel(o);setInv(true)}} variant="success">Cobrar</Button></td></tr>)}</tbody></table></Card> : <div className="grid grid-cols-3 gap-4">{del.map(o=><Card key={o.id} className="border-l-4 border-blue-500"><div className="p-3 border-b flex justify-between"><span className="font-bold">{o.customerName}</span><span className="text-xs bg-blue-50 px-2 py-1 rounded">{o.deliveryStatus||'Pendiente'}</span></div><div className="p-3 text-sm"><p className="flex gap-2"><MapPin size={14}/> {o.deliveryAddress}</p></div><div className="p-3 border-t bg-gray-50 flex gap-2">{o.deliveryStatus==='pending'?<Button onClick={()=>onUpdate(o.id,{deliveryStatus:'on_route'})} className="w-full text-xs">Asignar</Button>:<Button onClick={()=>onUpdate(o.id,{deliveryStatus:'delivered', status:'delivered'})} variant="success" className="w-full text-xs">Entregado</Button>}</div></Card>)}</div>}</div>
        
        {/* Modal Pago */}
        <Modal isOpen={inv} onClose={()=>setInv(false)} title={`Cobrar $${sel?.total}`} actions={<Button onClick={()=>setInv(false)} variant="secondary">Cancelar</Button>}>
            {!fiscalMode ? (
                <>
                    <div className="grid grid-cols-2 gap-4 mb-4"><button onClick={()=>doPay('cash')} className="p-4 border rounded hover:bg-green-50 flex flex-col items-center"><Banknote/><span className="font-bold text-green-600">Efectivo</span></button><button onClick={()=>doPay('card')} className="p-4 border rounded hover:bg-blue-50 flex flex-col items-center"><CreditCard/><span className="font-bold text-blue-600">Tarjeta</span></button></div>
                    <button onClick={()=>setFiscalMode(true)} className="w-full p-3 bg-purple-50 text-purple-700 rounded font-bold border border-purple-200 flex items-center justify-center gap-2"><FileText size={16}/> Requiero Factura</button>
                </>
            ) : (
                <div className="space-y-4">
                    <div className="flex gap-2"><button onClick={()=>setFiscalMode(false)} className="text-sm text-gray-500">&larr; Volver</button></div>
                    <h4 className="font-bold text-gray-700">Seleccionar Cliente Fiscal</h4>
                    <input className="w-full border p-2 rounded" placeholder="Buscar RFC o Nombre..." value={search} onChange={e=>setSearch(e.target.value)}/>
                    <div className="max-h-32 overflow-y-auto border rounded">{customers.filter(c=>c.rfc && (c.name.toLowerCase().includes(search.toLowerCase()) || c.rfc.includes(search.toUpperCase()))).map(c=><div key={c.id} onClick={()=>setFiscalCust(c)} className={`p-2 hover:bg-purple-50 cursor-pointer ${fiscalCust?.id===c.id?'bg-purple-100':''}`}><div className="font-bold">{c.name}</div><div className="text-xs text-gray-500">{c.rfc}</div></div>)}</div>
                    <div className="bg-gray-50 p-2 rounded text-xs text-gray-500">¿No existe? Agrégalo en el CRM.</div>
                    <Button onClick={()=>doPay('card')} className="w-full" disabled={!fiscalCust}>Confirmar y Facturar</Button>
                </div>
            )}
        </Modal>

        <Modal isOpen={z} onClose={()=>setZ(false)} title="Corte Z" actions={<Button onClick={()=>setZ(false)}>Cerrar</Button>}><div className="text-center space-y-4"><div className="p-4 bg-gray-100 rounded"><p className="text-sm text-gray-500">VENTA TOTAL</p><h2 className="text-3xl font-bold">${zData.tot}</h2></div><div className="flex justify-between px-8 text-sm"><div className="text-green-600 font-bold">Efectivo: ${zData.c}</div><div className="text-blue-600 font-bold">Tarjeta: ${zData.t}</div></div></div></Modal>
    </div>;
};

const AdminView = ({ products, users, customers, orders, onAddP, onUpdP, onDelP, onSeed, onAddU, onDelU, onAddC }) => {
    const [tab, setTab] = useState('menu');
    const [pForm, setPForm] = useState(null);
    const [edit, setEdit] = useState(false);
    
    // Facturación
    const pendingInvoices = orders.filter(o => o.invoiceRequired && o.invoiceData?.status === 'pending');
    const handleStamp = async (orderId) => {
        // Simulación de timbrado
        await onUpdP(orderId, { 'invoiceData.status': 'stamped', 'invoiceData.uuid': '550e8400-e29b-41d4-a716-446655440000' }, 'orders');
    };

    return <div className="h-screen flex flex-col bg-gray-100"><div className="bg-white p-4 border-b flex justify-between"><h1 className="text-xl font-bold flex gap-2"><Settings/> Admin</h1><div className="flex gap-2 bg-gray-100 p-1 rounded"><button onClick={()=>setTab('menu')} className={`px-4 py-1 rounded ${tab==='menu'?'bg-white shadow':''}`}>Menú</button><button onClick={()=>setTab('invoices')} className={`px-4 py-1 rounded ${tab==='invoices'?'bg-white shadow':''}`}>Facturas</button><button onClick={()=>setTab('users')} className={`px-4 py-1 rounded ${tab==='users'?'bg-white shadow':''}`}>Usuarios</button><button onClick={()=>setTab('crm')} className={`px-4 py-1 rounded ${tab==='crm'?'bg-white shadow':''}`}>CRM</button></div></div>
        <div className="flex-1 overflow-y-auto p-6">
            {tab==='menu' && <Card><div className="p-4 flex justify-between border-b"><h3 className="font-bold">Productos</h3><div className="flex gap-2">{!products.length && <Button onClick={onSeed} variant="secondary">Seed</Button>}<Button onClick={()=>{setPForm({}); setEdit(true)}}><Plus size={16}/></Button></div></div><table className="w-full text-left text-sm"><thead><tr className="bg-gray-50"><th className="p-3">Nombre</th><th className="p-3">Precio</th><th className="p-3">Stock</th><th className="p-3 text-right">Acción</th></tr></thead><tbody>{products.map(p=><tr key={p.id} className="border-b"><td className="p-3 font-bold">{p.name} <span className="text-xs font-normal text-gray-400 block">{p.category}</span></td><td className="p-3">${p.price}</td><td className="p-3">{p.stock}</td><td className="p-3 text-right"><button onClick={()=>onDelP(p.id)} className="text-red-500"><Trash2 size={16}/></button></td></tr>)}</tbody></table></Card>}
            {tab==='invoices' && <Card><div className="p-4 border-b font-bold flex gap-2 items-center"><FileText size={18}/> Facturación Pendiente</div><div className="divide-y">{pendingInvoices.length===0?<p className="p-4 text-center text-gray-400">Sin facturas pendientes</p> : pendingInvoices.map(o=><div key={o.id} className="p-4 flex justify-between items-center"><div><p className="font-bold">{o.invoiceData.name}</p><p className="text-xs text-gray-500">{o.invoiceData.rfc} • ${o.total}</p></div><Button onClick={()=>handleStamp(o.id)} variant="primary" className="text-xs">Timbrar</Button></div>)}</div></Card>}
            {tab==='users' && <Card><div className="p-4 border-b font-bold">Personal</div><div className="divide-y">{users.map(u=><div key={u.id} className="p-4 flex justify-between items-center"><div className="flex gap-2 items-center"><div className={`p-2 rounded-full ${ROLES[u.role]?.bg}`}>{React.createElement(ROLES[u.role]?.icon, {size:16, className:ROLES[u.role]?.color})}</div><span className="font-bold">{u.name}</span></div><button onClick={()=>onDelU(u.id)} className="text-red-500"><Trash2 size={16}/></button></div>)}</div></Card>}
            {tab==='crm' && <Card><div className="p-4 border-b font-bold">Clientes Registrados: {customers.length}</div><div className="p-4 text-sm text-gray-500">Módulo de visualización</div></Card>}
        </div>
        <Modal isOpen={edit} onClose={()=>setEdit(false)} title="Producto" actions={<Button onClick={()=>{const d={...pForm, price:Number(pForm.price), stock:Number(pForm.stock), isActive:true}; onAddP(d); setEdit(false);}}>Guardar</Button>}><div className="space-y-2"><input className="border w-full p-2 rounded" placeholder="Nombre" onChange={e=>setPForm({...pForm, name:e.target.value})}/><input className="border w-full p-2 rounded" placeholder="Categoría" onChange={e=>setPForm({...pForm, category:e.target.value})}/><div className="flex gap-2"><input className="border w-1/2 p-2 rounded" placeholder="Precio" type="number" onChange={e=>setPForm({...pForm, price:e.target.value})}/><input className="border w-1/2 p-2 rounded" placeholder="Stock" type="number" onChange={e=>setPForm({...pForm, stock:e.target.value})}/></div></div></Modal>
    </div>;
};

// --- MAIN ---
const INITIAL_PRODUCTS_SEED = [ { name: "Café de la casa", category: "Cafés calientes", price: 35, stock: 100, isActive: true }, { name: "Cappuccino", category: "Cafés calientes", price: 60, stock: 40, isActive: true }, { name: "Frappe Oreo", category: "Frappe", price: 65, stock: 10, isActive: true }, { name: "Pepsi", category: "Bebidas", price: 20, stock: 48, isActive: true }, { name: "Pastel de Zanahoria", category: "Postres", price: 45, stock: 8, isActive: true }, { name: "Sandwich Clásico", category: "Alimentos", price: 55, stock: 20, isActive: true }, ];
const INITIAL_USERS_SEED = [ { name: "Admin", role: "admin", pin: "0000", isActive: true }, { name: "Caja", role: "cashier", pin: "1111", isActive: true }, { name: "Mesero", role: "waiter", pin: "2222", isActive: true }, { name: "Cocina", role: "kitchen", pin: "3333", isActive: true }, { name: "Barra", role: "bar", pin: "5555", isActive: true }, { name: "Repartidor", role: "driver", pin: "4444", isActive: true }, ];
const INITIAL_CUSTOMERS_SEED = [{ name: "Cliente Mostrador", phone: "0000000000", address: "Local", rfc: "XAXX010101000", email: "", notes: "" }];

export default function App() {
    const [user, setUser] = useState(null);
    const [authU, setAuthU] = useState(null);
    const [data, setData] = useState({ prods:[], usrs:[], ords:[], cust:[] });
    const [modal, setModal] = useState({ open:false, t:'', m:'' });
    const [ticket, setTicket] = useState(null);

    useEffect(() => { const i = async () => { if(auth) await signInAnonymously(auth); }; i(); if(auth) return onAuthStateChanged(auth, setAuthU); }, []);
    
    useEffect(() => {
        if(!authU || !db) return;
        const u1 = onSnapshot(collection(db,'branches',appId,'products'), s=>setData(p=>({...p, prods:s.docs.map(d=>({id:d.id,...d.data()}))})));
        const u2 = onSnapshot(query(collection(db,'branches',appId,'orders')), s=>setData(p=>({...p, ords:s.docs.map(d=>({id:d.id,...d.data()}))})));
        const u3 = onSnapshot(collection(db,'branches',appId,'users'), s=>setData(p=>({...p, usrs:s.docs.map(d=>({id:d.id,...d.data()}))})));
        const u4 = onSnapshot(collection(db,'branches',appId,'customers'), s=>setData(p=>({...p, cust:s.docs.map(d=>({id:d.id,...d.data()}))})));
        return () => { u1(); u2(); u3(); u4(); };
    }, [authU]);

    // DB Helpers
    const seed = async (d, c) => { const b = writeBatch(db); const r = collection(db,'branches',appId,c); d.forEach(x => b.set(doc(r), x)); await b.commit(); };
    const createOrder = async (d) => { if(authU){ await addDoc(collection(db,'branches',appId,'orders'), {...d, createdAt:serverTimestamp()}); return {success:true}; }};
    const updateOrder = async (id,d,col) => { if(authU) await updateDoc(doc(db,'branches',appId, col || 'orders', id), {...d, updatedAt:serverTimestamp()}); };
    const addCust = async (d) => { if(authU) await addDoc(collection(db,'branches',appId,'customers'), d); };
    const addProd = async (d) => { if(authU) await addDoc(collection(db,'branches',appId,'products'), d); };
    const delProd = async (id) => { if(authU) await deleteDoc(doc(db,'branches',appId,'products',id)); };
    const delUser = async (id) => { if(authU) await deleteDoc(doc(db,'branches',appId,'users',id)); };

    const notify = (t,m,type) => setModal({open:true, t, m});

    if(!user) return <LoginView users={data.usrs} onLogin={setUser} online={!!authU} />;

    return <div className="font-sans text-gray-900">
        {user && <div className="bg-gray-900 text-white p-3 flex justify-between items-center"><div className="flex gap-2 font-bold text-amber-500"><Coffee/> Café Caro ERP</div><div className="flex gap-4 items-center"><span className="text-sm">{user.name}</span><button onClick={()=>setUser(null)}><LogOut size={16}/></button></div></div>}
        {user.role==='waiter' && <WaiterView user={user} products={data.prods} customers={data.cust} orders={data.ords} onCreateOrder={createOrder} onAddCustomer={addCust} notify={notify}/>}
        {(user.role==='kitchen' || user.role==='bar') && <ProductionView orders={data.ords} onUpdate={updateOrder} role={user.role}/>}
        {user.role==='cashier' && <CashierView orders={data.ords} customers={data.cust} onUpdate={updateOrder} modal={notify} receipt={setTicket} onAddCustomer={addCust}/>}
        {user.role==='driver' && <div className="p-6">Vista Driver (Ver App.jsx anterior para código completo)</div>}
        {user.role==='admin' && <AdminView products={data.prods} users={data.usrs} customers={data.cust} orders={data.ords} onAddP={addProd} onUpdP={updateOrder} onDelP={delProd} onDelU={delUser} onSeed={()=>{seed(INITIAL_PRODUCTS_SEED,'products');seed(INITIAL_USERS_SEED,'users');}}/>}
        
        <Modal isOpen={modal.open} onClose={()=>setModal({...modal, open:false})} title={modal.t} actions={<Button onClick={()=>setModal({...modal, open:false})}>OK</Button>}><p>{modal.m}</p></Modal>
        <Modal isOpen={!!ticket} onClose={()=>setTicket(null)} title="Ticket" actions={<Button onClick={()=>window.print()}>Imprimir</Button>}>
            <div className="font-mono text-xs p-4 bg-white border"><h2 className="text-center font-bold text-lg mb-2">Café Caro</h2><p className="text-center mb-4">Ticket de Venta</p>
            {ticket?.invoiceRequired && <div className="border border-black p-1 text-center mb-2 font-bold">FACTURA: {ticket.invoiceData?.rfc}</div>}
            <div className="border-b mb-2"></div>{ticket?.items.map((i,x)=><div key={x} className="flex justify-between"><span>{i.quantity} {i.name.substr(0,15)}</span><span>${i.price*i.quantity}</span></div>)}<div className="border-b my-2"></div><div className="flex justify-between font-bold text-lg"><span>TOTAL</span><span>${ticket?.total}</span></div></div>
        </Modal>
    </div>;
}
