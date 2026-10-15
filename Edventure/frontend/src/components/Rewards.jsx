import React, { useState, useEffect } from 'react';
import { Star, Award, Sparkles, ShoppingBag } from 'lucide-react';
import SideBar from './SideBar';
import { shopAPI, authAPI } from '../services/api';

function Rewards() {
  const [userPoints, setUserPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Shop state
  const [shopCatalog, setShopCatalog] = useState({ TITLES: [], AVATARS: [] });
  const [equippedTitle, setEquippedTitle] = useState('');
  const [equippedAvatar, setEquippedAvatar] = useState('');
  const [unlockedTitles, setUnlockedTitles] = useState([]);
  const [unlockedAvatars, setUnlockedAvatars] = useState([]);
  const [actionLoading, setActionLoading] = useState(null);
  const [shopNotification, setShopNotification] = useState('');

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch (err) {
      console.warn('Logout error', err);
    } finally {
      window.location.href = '/login';
    }
  };

  const fetchShopAndUser = async () => {
    try {
      setLoading(true);
      // Fetch shop catalog and inventory from backend
      const shopRes = await shopAPI.getCatalog();
      const shopData = shopRes.data?.data;
      if (shopData) {
        setShopCatalog(shopData.catalog || { TITLES: [], AVATARS: [] });
        setUserPoints(shopData.userInventory?.points || 0);
        setEquippedTitle(shopData.userInventory?.equippedTitle || '');
        setEquippedAvatar(shopData.userInventory?.equippedAvatar || '');
        setUnlockedTitles(shopData.userInventory?.unlockedTitles || ['Novice Scholar']);
        setUnlockedAvatars(shopData.userInventory?.unlockedAvatars || ['default']);
      }
    } catch (error) {
      console.error('Error fetching rewards shop data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShopAndUser();
  }, []);

  const handlePurchase = async (type, item) => {
    if (userPoints < item.cost) {
      alert(`You need ${item.cost - userPoints} more XP to unlock "${item.name}"!`);
      return;
    }

    try {
      setActionLoading(item.id);
      const res = await shopAPI.purchaseItem(type, item.id);
      const data = res.data?.data;
      if (data) {
        setUserPoints(data.pointsRemaining);
        if (type === 'title') {
          setUnlockedTitles(data.unlockedTitles);
        } else {
          setUnlockedAvatars(data.unlockedAvatars);
        }
        setShopNotification(`🎉 Successfully unlocked "${item.name}"!`);
        setTimeout(() => setShopNotification(''), 4000);
      }
    } catch (err) {
      console.error('Purchase error:', err);
      alert(err.response?.data?.message || 'Failed to complete purchase.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEquip = async (type, item) => {
    try {
      setActionLoading(item.id);
      await shopAPI.equipItem(type, item.id);
      if (type === 'title') {
        setEquippedTitle(item.name);
      } else {
        setEquippedAvatar(item.avatarUrl || item.id);
      }
      setShopNotification(`✨ Equipped "${item.name}"!`);
      setTimeout(() => setShopNotification(''), 4000);
    } catch (err) {
      console.error('Equip error:', err);
      alert(err.response?.data?.message || 'Failed to equip item.');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A1F2B] flex items-center justify-center text-[#9AE9FD]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#9AE9FD] mx-auto mb-4"></div>
          <p className="text-xl font-bold">Opening Rewards Vault...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A1F2B] text-white" style={{ fontFamily: "Inter, sans-serif" }}>
      <SideBar onLogout={handleLogout} />
      <div className="md:ml-64 p-4 md:p-8">
        
        {/* Banner */}
        <div className="bg-[#B8C5C9] rounded-2xl p-6 md:p-8 mb-8 flex flex-col md:flex-row items-center justify-between shadow-xl gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-[#002732] text-[#9AE9FD] px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
              <ShoppingBag className="w-3.5 h-3.5" /> Rewards & Honors Shop
            </div>
            <h1 className="text-3xl font-extrabold text-[#002732] mb-1">Redeem Your XP</h1>
            <p className="text-[#002732]/80 text-sm md:text-base font-medium">
              Spend points earned in 1v1 battlegrounds, practice quizzes, and syllabus RAG on equippable titles and custom avatars.
            </p>
          </div>
          <div className="bg-[#1E3A47] border border-[#2A4A57] rounded-2xl px-6 py-4 flex items-center gap-3 shrink-0 shadow-lg">
            <Star className="w-8 h-8 text-[#9AE9FD]" />
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Your Balance</div>
              <div className="text-3xl font-black text-[#9AE9FD]">{userPoints} XP</div>
            </div>
          </div>
        </div>

        {/* Notifications */}
        {shopNotification && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-center font-medium shadow animate-fadeIn">
            {shopNotification}
          </div>
        )}

        {/* SHOP ITEMS */}
        <div className="space-y-10">
          {/* Titles Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-[#9AE9FD]" />
              <h2 className="text-2xl font-bold text-[#9AE9FD]">Equippable Titles</h2>
              <span className="text-xs text-slate-400 ml-2">(Displayed on your Profile and 1v1 Arena)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(shopCatalog.TITLES || []).map((titleItem) => {
                const isUnlocked = unlockedTitles.includes(titleItem.id) || unlockedTitles.includes(titleItem.name);
                const isEquipped = equippedTitle === titleItem.name || equippedTitle === titleItem.id;
                const canAfford = userPoints >= titleItem.cost;

                return (
                  <div
                    key={titleItem.id}
                    className={`bg-[#1E3A47] rounded-2xl p-6 border transition-all duration-300 hover:border-[#9AE9FD]/50 ${
                      isEquipped
                        ? 'border-[#9AE9FD] ring-2 ring-[#9AE9FD]/50 shadow-xl'
                        : isUnlocked
                        ? 'border-emerald-500/40'
                        : 'border-[#2A4A57]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl">👑</span>
                      {isEquipped ? (
                        <span className="bg-[#9AE9FD] text-[#002732] text-xs font-bold px-3 py-1 rounded-full">
                          EQUIPPED
                        </span>
                      ) : isUnlocked ? (
                        <span className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-3 py-1 rounded-full">
                          UNLOCKED
                        </span>
                      ) : (
                        <span className="bg-[#0F2933] text-[#9AE9FD] text-xs font-bold px-3 py-1 rounded-full border border-[#9AE9FD]/20">
                          {titleItem.cost} XP
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-white mb-1">{titleItem.name}</h3>
                    <p className="text-xs text-slate-400 mb-6">{titleItem.description}</p>
                    
                    {isEquipped ? (
                      <button
                        disabled
                        className="w-full py-2.5 rounded-xl bg-[#0F2933] text-[#9AE9FD] font-semibold text-sm cursor-default border border-[#9AE9FD]/40"
                      >
                        ✓ In Use
                      </button>
                    ) : isUnlocked ? (
                      <button
                        onClick={() => handleEquip('title', titleItem)}
                        disabled={actionLoading === titleItem.id}
                        className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-transform active:scale-95 shadow"
                      >
                        {actionLoading === titleItem.id ? 'Equipping...' : 'Equip Title'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handlePurchase('title', titleItem)}
                        disabled={!canAfford || actionLoading === titleItem.id}
                        className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all ${
                          canAfford
                            ? 'bg-[#9AE9FD] text-[#002732] hover:bg-[#7FB3C1] active:scale-95 shadow-md'
                            : 'bg-gray-700/50 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        {actionLoading === titleItem.id
                          ? 'Processing...'
                          : canAfford
                          ? `Unlock for ${titleItem.cost} XP`
                          : `Need ${titleItem.cost - userPoints} more XP`}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Avatars Section */}
          {shopCatalog.AVATARS && shopCatalog.AVATARS.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-5 h-5 text-[#9AE9FD]" />
                <h2 className="text-2xl font-bold text-[#9AE9FD]">Custom Hero Avatars</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {shopCatalog.AVATARS.map((avatarItem) => {
                  const isUnlocked = unlockedAvatars.includes(avatarItem.id);
                  const isEquipped = equippedAvatar === avatarItem.avatarUrl || equippedAvatar === avatarItem.id;
                  const canAfford = userPoints >= avatarItem.cost;

                  return (
                    <div
                      key={avatarItem.id}
                      className={`bg-[#1E3A47] rounded-2xl p-6 border transition-all ${
                        isEquipped
                          ? 'border-[#9AE9FD] ring-2 ring-[#9AE9FD]/50 shadow-xl'
                          : isUnlocked
                          ? 'border-emerald-500/40'
                          : 'border-[#2A4A57]'
                      }`}
                    >
                      <div className="flex items-center gap-4 mb-4">
                        <img
                          src={avatarItem.avatarUrl}
                          alt={avatarItem.name}
                          className="w-16 h-16 rounded-full object-cover border-2 border-[#9AE9FD]/50"
                        />
                        <div>
                          <h3 className="text-lg font-bold text-white">{avatarItem.name}</h3>
                          <span className="text-xs text-[#9AE9FD] font-semibold">{avatarItem.cost} XP</span>
                        </div>
                      </div>
                      {isEquipped ? (
                        <button
                          disabled
                          className="w-full py-2.5 rounded-xl bg-[#0F2933] text-[#9AE9FD] font-semibold text-sm cursor-default border border-[#9AE9FD]/40"
                        >
                          ✓ Active Avatar
                        </button>
                      ) : isUnlocked ? (
                        <button
                          onClick={() => handleEquip('avatar', avatarItem)}
                          disabled={actionLoading === avatarItem.id}
                          className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-transform active:scale-95 shadow"
                        >
                          Equip Avatar
                        </button>
                      ) : (
                        <button
                          onClick={() => handlePurchase('avatar', avatarItem)}
                          disabled={!canAfford || actionLoading === avatarItem.id}
                          className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all ${
                            canAfford
                              ? 'bg-[#9AE9FD] text-[#002732] hover:bg-[#7FB3C1] active:scale-95 shadow'
                              : 'bg-gray-700/50 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          {canAfford ? `Unlock (${avatarItem.cost} XP)` : `Need ${avatarItem.cost - userPoints} XP`}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Rewards;