/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db, loginWithGoogle, logout, OperationType, handleFirestoreError } from './firebase';
import { 
  Coffee, 
  Trash2, 
  Plus, 
  List, 
  User as UserIcon, 
  Clock, 
  AlertCircle,
  ChevronRight,
  LogOut,
  LogIn,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Order {
  id: string;
  userName: string;
  drinkName: string;
  sugar: string;
  ice: string;
  note: string;
  price: number;
  createdAt: Timestamp;
}

export default function App() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [showOrders, setShowOrders] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Form State
  const [formData, setFormData] = useState({
    userName: '',
    drinkName: '',
    sugar: '全糖',
    ice: '正常冰',
    note: '',
    price: ''
  });

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  // Real-time Order Listener
  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      setOrders(docs);
      setLastUpdate(new Date());
      setLoading(false);
    }, (error) => {
      console.error("Snapshot error:", error);
      // We don't want to overflow the logs with "missing permissions" if they haven't logged in,
      // but the rules allow public READ, so this should only fail on unexpected errors.
    });

    return () => unsubscribe();
  }, []);

  // Update clock every second to fulfill the "per second update" feel requested
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(prev => {
        // Just used to refresh the UI's relative time displays if any, 
        // and show the "heartbeat" of the app
        return new Date();
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.userName || !formData.drinkName || !formData.price) return;

    setSubmitting(true);
    const path = 'orders';
    try {
      await addDoc(collection(db, path), {
        ...formData,
        price: Number(formData.price),
        createdAt: serverTimestamp()
      });
      setFormData({
        userName: '',
        drinkName: '',
        sugar: '全糖',
        ice: '正常冰',
        note: '',
        price: ''
      });
      setShowOrders(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) {
      alert("請登入後再進行刪除操作 (管理權限)");
      return;
    }
    const path = `orders/${id}`;
    try {
      await deleteDoc(doc(db, 'orders', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const totalPrice = orders.reduce((sum, order) => sum + (order.price || 0), 0);

  return (
    <div className="min-h-screen bg-[#FDFCF8] text-[#3D3228] font-sans pb-12">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-[#E8E2D8] z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-[#5A5A40] p-2 rounded-xl text-white">
              <Coffee size={24} />
            </div>
            <h1 className="font-bold text-xl tracking-tight hidden sm:block">TeaOrder 團購小助手</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end mr-2">
              <span className="text-[10px] uppercase tracking-widest text-[#8E8B82] font-semibold">Real-time Sync</span>
              <span className="text-[11px] font-mono font-medium opacity-60">
                {lastUpdate.toLocaleTimeString()}
              </span>
            </div>
            
            {user ? (
              <div className="flex items-center gap-3">
                <img src={user.photoURL || ''} alt="" className="w-8 h-8 rounded-full border border-[#D1CEC7]" />
                <button 
                  onClick={logout}
                  className="p-2 hover:bg-[#F0EEE6] rounded-full transition-colors text-[#8E8B82]"
                  title="登出"
                >
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <button 
                onClick={loginWithGoogle}
                className="flex items-center gap-2 px-4 py-2 bg-[#5A5A40] text-white rounded-full font-medium hover:bg-[#4A4A35] transition-all transform active:scale-95 shadow-sm"
              >
                <LogIn size={16} />
                <span className="text-sm">管理者登入</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto pt-24 px-4">
        <div className="grid lg:grid-cols-12 gap-8 lg:items-start">
          
          {/* Order Form */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-5 bg-white border border-[#E8E2D8] rounded-3xl p-6 sm:p-8 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[#5A5A40]/10 rounded-full flex items-center justify-center">
                <Plus className="text-[#5A5A40]" size={20} />
              </div>
              <h2 className="text-xl font-bold">我要點餐</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#8E8B82] mb-1.5 ml-1">點餐人姓名</label>
                <input 
                  required
                  type="text" 
                  value={formData.userName}
                  onChange={e => setFormData({...formData, userName: e.target.value})}
                  className="w-full px-4 py-3 bg-[#FCFBF8] border border-[#E8E2D8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/10 transition-all font-medium"
                  placeholder="例如：小明"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#8E8B82] mb-1.5 ml-1">飲品名稱</label>
                <input 
                  required
                  type="text" 
                  value={formData.drinkName}
                  onChange={e => setFormData({...formData, drinkName: e.target.value})}
                  className="w-full px-4 py-3 bg-[#FCFBF8] border border-[#E8E2D8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/10 transition-all font-medium"
                  placeholder="例如：紅茶拿鐵"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#8E8B82] mb-1.5 ml-1">甜度</label>
                  <select 
                    value={formData.sugar}
                    onChange={e => setFormData({...formData, sugar: e.target.value})}
                    className="w-full px-4 py-3 bg-[#FCFBF8] border border-[#E8E2D8] rounded-xl focus:outline-none appearance-none font-medium"
                  >
                    {['全糖', '七分', '半糖', '三分', '無糖'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#8E8B82] mb-1.5 ml-1">冰塊</label>
                  <select 
                    value={formData.ice}
                    onChange={e => setFormData({...formData, ice: e.target.value})}
                    className="w-full px-4 py-3 bg-[#FCFBF8] border border-[#E8E2D8] rounded-xl focus:outline-none appearance-none font-medium"
                  >
                    {['正常冰', '少冰', '微冰', '去冰', '溫', '熱'].map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#8E8B82] mb-1.5 ml-1">價格 (NT$)</label>
                <input 
                  required
                  type="number" 
                  value={formData.price}
                  onChange={e => setFormData({...formData, price: e.target.value})}
                  className="w-full px-4 py-3 bg-[#FCFBF8] border border-[#E8E2D8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/10 transition-all font-medium"
                  placeholder="例如：60"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#8E8B82] mb-1.5 ml-1">備註 (可不填)</label>
                <textarea 
                  value={formData.note}
                  onChange={e => setFormData({...formData, note: e.target.value})}
                  className="w-full px-4 py-3 bg-[#FCFBF8] border border-[#E8E2D8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/10 transition-all font-medium min-h-[80px]"
                  placeholder="珍珠加量、不加糖、其他需求..."
                />
              </div>

              <button 
                type="submit"
                disabled={submitting}
                className="w-full py-4 bg-[#5A5A40] text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#5A5A40]/20 hover:bg-[#4A4A35] transition-all disabled:opacity-50"
              >
                {submitting ? "提交中..." : (
                  <>
                    <CheckCircle2 size={20} />
                    <span>送出訂單</span>
                  </>
                )}
              </button>
            </form>
          </motion.div>

          {/* List Section */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            
            {/* View Button / Toggle */}
            <div className="flex items-center justify-between bg-white border border-[#E8E2D8] rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#8E8B82]/10 rounded-full flex items-center justify-center">
                  <List className="text-[#8E8B82]" size={20} />
                </div>
                <span className="font-bold">目前的訂單 ({orders.length})</span>
              </div>
              <button 
                onClick={() => setShowOrders(!showOrders)}
                className="px-5 py-2 rounded-xl bg-[#F0EEE6] font-bold text-sm hover:bg-[#E8E5D8] transition-colors flex items-center gap-2"
              >
                {showOrders ? "隱藏清單" : "檢視清單"}
                <ChevronRight size={16} className={`transition-transform duration-300 ${showOrders ? 'rotate-90' : ''}`} />
              </button>
            </div>

            <AnimatePresence>
              {showOrders && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                  className="space-y-4"
                >
                  {/* Summary Card */}
                  <div className="bg-[#5A5A40] text-white rounded-3xl p-8 shadow-xl shadow-[#5A5A40]/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                    <div className="relative z-10">
                      <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-1">今日統計</p>
                      <p className="text-4xl font-bold">{orders.length} <span className="text-lg font-normal opacity-70">杯飲品</span></p>
                    </div>
                    <div className="relative z-10 sm:text-right">
                      <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-1">總金額</p>
                      <p className="text-4xl font-bold"><span className="text-lg font-normal mr-1 opacity-70">NT$</span>{totalPrice}</p>
                    </div>
                  </div>

                  {/* Orders List */}
                  <div className="bg-white border border-[#E8E2D8] rounded-3xl overflow-hidden shadow-sm">
                    {loading ? (
                      <div className="p-16 text-center text-[#8E8B82]">
                        <Clock className="mx-auto mb-4 animate-spin opacity-40" size={32} />
                        <p className="font-medium">正在載入即時訂單...</p>
                      </div>
                    ) : orders.length === 0 ? (
                      <div className="p-16 text-center text-[#8E8B82]">
                        <div className="w-20 h-20 bg-[#F0EEE6] rounded-full mx-auto mb-6 flex items-center justify-center">
                          <AlertCircle className="opacity-40" size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-[#3D3228] mb-2">尚無訂單</h3>
                        <p className="text-sm">快來下第一張單，開啟今日的茶飲團購吧！</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-[#F0EEE6]">
                        {orders.map((order, idx) => (
                          <motion.div 
                            layout
                            key={order.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="p-5 flex items-center justify-between hover:bg-[#FCFBF8] transition-colors group"
                          >
                            <div className="flex-1 min-w-0 pr-4">
                              <div className="flex items-center gap-3 mb-1.5">
                                <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-[#F0EEE6] rounded-xl text-xs font-bold text-[#8E8B82]">
                                  {orders.length - idx}
                                </span>
                                <div className="min-w-0">
                                  <h3 className="font-bold text-[#3D3228] truncate">
                                    <span className="text-[#8E8B82] font-normal">{order.userName}</span>
                                    <span className="mx-2 text-[#E8E2D8] font-normal">|</span>
                                    {order.drinkName}
                                  </h3>
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-[10px] text-[#8E8B82] font-bold uppercase tracking-wider pl-11">
                                <span className="bg-[#F0EEE6] px-2 py-0.5 rounded-lg border border-[#E8E2D8]">{order.sugar}</span>
                                <span className="bg-[#F0EEE6] px-2 py-0.5 rounded-lg border border-[#E8E2D8]">{order.ice}</span>
                                <span className="text-[#5A5A40] ml-1">NT$ {order.price}</span>
                              </div>
                              {order.note && (
                                <p className="mt-3 text-xs italic text-[#A8A498] pl-11 line-clamp-1 border-l-2 border-[#E8E2D8] ml-11">
                                  {order.note}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              {user ? (
                                <button 
                                  onClick={() => handleDelete(order.id)}
                                  className="w-10 h-10 flex items-center justify-center text-[#8E8B82] hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                  title="刪除訂單"
                                >
                                  <Trash2 size={18} />
                                </button>
                              ) : null}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {!showOrders && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-12 border-2 border-dashed border-[#E8E2D8] rounded-3xl text-center text-[#8E8B82] bg-white/40"
              >
                <div className="w-12 h-12 bg-[#F0EEE6] rounded-full mx-auto mb-4 flex items-center justify-center">
                  <List size={20} className="opacity-40" />
                </div>
                <p className="text-sm font-medium">點擊「檢視清單」查看現有訂單與統計數據</p>
              </motion.div>
            )}
          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="max-w-5xl mx-auto px-4 mt-12 py-8 border-t border-[#E8E2D8] flex flex-col sm:flex-row items-center justify-between gap-4 text-[#8E8B82] text-[10px] font-bold uppercase tracking-widest">
        <div className="flex items-center gap-4">
          <span>&copy; 2024 TEA ORDER HELPER</span>
          <span className="hidden sm:inline text-[#E8E2D8]">|</span>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>System Active</span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <a href="#" className="hover:text-[#5A5A40] transition-colors">Privacy</a>
          <a href="#" className="hover:text-[#5A5A40] transition-colors">Terms</a>
          <a href="#" className="hover:text-[#5A5A40] transition-colors">Help</a>
        </div>
      </footer>

      {/* Auth Note for Admin */}
      {!user && showOrders && orders.length > 0 && (
         <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1A1A1A] text-white px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-2xl z-50 flex items-center gap-3 backdrop-blur-md bg-opacity-90"
        >
          <AlertCircle size={14} className="text-yellow-500" />
          <span>登入管理者帳號即可移除訂單</span>
        </motion.div>
      )}
    </div>
  );
}
