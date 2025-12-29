
import React from 'react';
import { User } from '../types';

interface ProfileProps {
  user: User;
  onLogout: () => void;
}

const Profile: React.FC<ProfileProps> = ({ user, onLogout }) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center py-6">
        <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-4xl font-bold shadow-inner mb-4">
          {user.name[0]}
        </div>
        <h2 className="text-2xl font-bold text-gray-800">{user.name}</h2>
        <p className="text-gray-400 font-medium">{user.email}</p>
        <span className={`mt-2 inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full ${user.isActivated ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
          <i className={`fa-solid ${user.isActivated ? 'fa-check-circle' : 'fa-circle-xmark'}`}></i>
          {user.isActivated ? 'Verified Account' : 'Action Required: Activate ID'}
        </span>
      </div>

      <div className="bg-white rounded-3xl p-2 shadow-sm border border-gray-100">
        <ProfileItem icon="fa-phone" label="Phone" value={user.phone} />
        <ProfileItem icon="fa-id-badge" label="Reference ID" value={user.refId} />
        <ProfileItem icon="fa-users-viewfinder" label="Total Referrals" value={user.referralCount.toString()} />
        <ProfileItem icon="fa-calendar-day" label="Joined Date" value={user.joinedAt} />
        <ProfileItem icon="fa-wallet" label="Total Balance" value={`৳${user.balance.toFixed(2)}`} />
      </div>

      <div className="space-y-3">
        <button className="w-full bg-white text-gray-700 border border-gray-100 p-4 rounded-2xl flex items-center justify-between font-bold shadow-sm hover:bg-gray-50 transition">
          <div className="flex items-center gap-3">
            <i className="fa-solid fa-lock text-gray-400"></i>
            Change Password
          </div>
          <i className="fa-solid fa-chevron-right text-xs"></i>
        </button>
        
        <button 
          onClick={onLogout}
          className="w-full bg-red-50 text-red-600 p-4 rounded-2xl flex items-center justify-center gap-3 font-bold hover:bg-red-100 transition"
        >
          <i className="fa-solid fa-right-from-bracket"></i>
          Logout
        </button>
      </div>
    </div>
  );
};

const ProfileItem: React.FC<{ icon: string, label: string, value: string }> = ({ icon, label, value }) => (
  <div className="flex items-center justify-between p-4 hover:bg-gray-50 transition rounded-2xl">
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
        <i className={`fa-solid ${icon}`}></i>
      </div>
      <span className="text-sm font-medium text-gray-500">{label}</span>
    </div>
    <span className="font-bold text-gray-800">{value}</span>
  </div>
);

export default Profile;
