
import React, { useState, useEffect } from 'react';
import { User, Task, WithdrawalRequest, ActivationRequest } from './types';
import { APP_NAME, REFERRAL_BONUS } from './constants';
import { db, auth } from './firebase';
import { ref, onValue, set, update, push, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import Sidebar from './components/Sidebar';
import TaskList from './components/TaskList';
import Activation from './components/Activation';
import Profile from './components/Profile';
import WithdrawalForm from './components/WithdrawalForm';
import AdminPanel from './components/AdminPanel';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'DASHBOARD' | 'TASKS' | 'PROFILE' | 'WITHDRAW' | 'ADMIN' | 'ACTIVATION'>('DASHBOARD');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [activations, setActivations] = useState<ActivationRequest[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        onValue(ref(db, `users/${firebaseUser.uid}`), (snapshot) => {
          const data = snapshot.val();
          if (data) setUser(data);
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    onValue(ref(db, 'tasks'), (snapshot) => {
      const data = snapshot.val();
      setTasks(data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : []);
    });

    onValue(ref(db, 'withdrawals'), (snapshot) => {
      const data = snapshot.val();
      setWithdrawals(data ? Object.keys(data).map(key => ({ id: key, ...data[key] })).reverse() : []);
    });

    onValue(ref(db, 'activations'), (snapshot) => {
      const data = snapshot.val();
      setActivations(data ? Object.keys(data).map(key => ({ id: key, ...data[key] })).reverse() : []);
    });

    return () => unsubscribeAuth();
  }, []);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-blue-600 text-white">
      <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mb-4"></div>
      <h1 className="font-black text-2xl italic tracking-tighter animate-pulse">Jio Earn Loading...</h1>
    </div>
  );

  if (!user) return <Auth onLogin={() => {}} />;

  const handleActivationRequest = async (method: 'bKash' | 'Nagad', txId: string) => {
    const newRef = push(ref(db, 'activations'));
    const request: ActivationRequest = {
      id: newRef.key as string,
      userId: user.id,
      userName: user.name,
      method,
      txId,
      status: 'PENDING',
      date: new Date().toLocaleString('en-BD')
    };
    await set(newRef, request);
    await update(ref(db, `users/${user.id}`), { isActivationPending: true });
  };

  const handleApproveActivation = async (req: ActivationRequest) => {
    try {
      // 1. Activate User
      await update(ref(db, `users/${req.userId}`), { isActivated: true, isActivationPending: false });
      // 2. Mark Request as Approved
      await update(ref(db, `activations/${req.id}`), { status: 'APPROVED' });
      
      // 3. Handle Referral Bonus
      const userSnap = await get(ref(db, `users/${req.userId}`));
      const userData = userSnap.val() as User;
      
      if (userData.referredBy) {
        const usersSnap = await get(ref(db, 'users'));
        const allUsers = usersSnap.val();
        const referrerId = Object.keys(allUsers).find(uid => allUsers[uid].refId === userData.referredBy);
        
        if (referrerId) {
          const r = allUsers[referrerId];
          await update(ref(db, `users/${referrerId}`), {
            balance: (r.balance || 0) + REFERRAL_BONUS,
            referralIncome: (r.referralIncome || 0) + REFERRAL_BONUS,
            referralCount: (r.referralCount || 0) + 1
          });
        }
      }
      alert("ইউজার আইডি এক্টিভ করা হয়েছে!");
    } catch (e) {
      alert("Error: " + e.message);
    }
  };

  const renderContent = () => {
    if (!user.isActivated && currentView !== 'ACTIVATION' && currentView !== 'PROFILE') {
      return <Activation 
        onActivate={handleActivationRequest} 
        isPending={user.isActivationPending} 
      />;
    }
    
    switch (currentView) {
      case 'DASHBOARD': return <Dashboard user={user} />;
      case 'TASKS': return <TaskList tasks={tasks} onComplete={async (id) => {
        const task = tasks.find(t => t.id === id);
        if (task) {
          await update(ref(db, `users/${user.id}`), { balance: user.balance + task.reward });
          alert(`অভিনন্দন! আপনি ৳${task.reward} পেয়েছেন।`);
        }
      }} />;
      case 'WITHDRAW': return <WithdrawalForm balance={user.balance} onSubmit={async (req) => {
        const newRef = push(ref(db, 'withdrawals'));
        await set(newRef, { ...req, id: newRef.key, userId: user.id, userName: user.name, status: 'PENDING', date: new Date().toLocaleDateString() });
        await update(ref(db, `users/${user.id}`), { balance: user.balance - req.amount, totalWithdraw: user.totalWithdraw + req.amount });
        alert("উইথড্র রিকোয়েস্ট সফল হয়েছে!");
      }} />;
      case 'PROFILE': return <Profile user={user} onLogout={() => signOut(auth)} />;
      case 'ADMIN': return <AdminPanel 
        tasks={tasks} 
        onAddTask={async (t) => await push(ref(db, 'tasks'), t)} 
        onDeleteTask={async (id) => await set(ref(db, `tasks/${id}`), null)} 
        withdrawalRequests={withdrawals} 
        activationRequests={activations}
        onWithdrawAction={async (id, s) => await update(ref(db, `withdrawals/${id}`), { status: s })}
        onActivationAction={async (id, s) => {
          if (s === 'APPROVED') {
            const req = activations.find(a => a.id === id);
            if (req) handleApproveActivation(req);
          } else {
            await update(ref(db, `activations/${id}`), { status: s });
            const req = activations.find(a => a.id === id);
            if (req) await update(ref(db, `users/${req.userId}`), { isActivationPending: false });
          }
        }}
      />;
      case 'ACTIVATION': return <Activation onActivate={handleActivationRequest} isPending={user.isActivationPending} />;
      default: return <Dashboard user={user} />;
    }
  };

  return (
    <div className="min-h-screen max-w-md mx-auto bg-gray-50 flex flex-col shadow-2xl relative">
      <header className="bg-blue-600 text-white p-5 flex justify-between items-center sticky top-0 z-50 rounded-b-3xl shadow-lg">
        <h1 className="text-xl font-black italic uppercase tracking-tighter">{APP_NAME}</h1>
        <div className="flex gap-4 items-center">
          {user.role === 'ADMIN' && (
            <button 
              onClick={() => setCurrentView('ADMIN')} 
              className={`text-[10px] px-3 py-1 rounded-full font-black uppercase transition-all ${currentView === 'ADMIN' ? 'bg-white text-blue-600' : 'bg-blue-700 text-white'}`}
            >
              Admin
            </button>
          )}
          <button onClick={() => setIsSidebarOpen(true)} className="text-2xl active:scale-90 transition-transform">
            <i className="fa-solid fa-bars-staggered"></i>
          </button>
        </div>
      </header>

      <main className="flex-1 p-5 pb-28">{renderContent()}</main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/90 backdrop-blur-xl border-t border-gray-100 flex justify-around p-4 z-40 rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <NavBtn icon="fa-house" label="Home" active={currentView === 'DASHBOARD'} onClick={() => setCurrentView('DASHBOARD')} />
        <NavBtn icon="fa-list-check" label="Jobs" active={currentView === 'TASKS'} onClick={() => setCurrentView('TASKS')} />
        <NavBtn icon="fa-wallet" label="Withdraw" active={currentView === 'WITHDRAW'} onClick={() => setCurrentView('WITHDRAW')} />
        <NavBtn icon="fa-user" label="Me" active={currentView === 'PROFILE'} onClick={() => setCurrentView('PROFILE')} />
      </nav>

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} user={user} onNavigate={(v) => { setCurrentView(v); setIsSidebarOpen(false); }} />
    </div>
  );
};

const NavBtn = ({ icon, label, active, onClick }: any) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-blue-600 scale-110' : 'text-gray-400'}`}>
    <i className={`fa-solid ${icon} text-lg`}></i>
    <span className="text-[9px] font-black uppercase tracking-tight">{label}</span>
  </button>
);

export default App;
