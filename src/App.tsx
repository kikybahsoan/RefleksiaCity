import React, { useState, useEffect } from 'react';
import { User, Building, ChatMessage } from './types';
import { api } from './services/api';
import { IsometricMap } from './components/IsometricMap';
import { HUD } from './components/HUD';
import { BuildingModal } from './components/BuildingModal';
import { TeacherDashboard } from './components/TeacherDashboard';
import { LoginModal } from './components/LoginModal';
import { SheetsConfigModal } from './components/SheetsConfigModal';
import { NotificationManager } from './components/NotificationManager';
import { BottomChatOverlay } from './components/BottomChatOverlay';
import { TeacherAuthModal } from './components/TeacherAuthModal';
import { filterProfanity } from './utils/filter';
import { sounds } from './utils/audio';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [activeBuilding, setActiveBuilding] = useState<Building | null>(null);

  // Chat messages & active player speech bubble
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [playerSpeechText, setPlayerSpeechText] = useState<string | undefined>(undefined);

  // Modals
  const [showTeacherPanel, setShowTeacherPanel] = useState(false);
  const [isTeacherPanelUnlocked, setIsTeacherPanelUnlocked] = useState(false);
  const [showTeacherAuthModal, setShowTeacherAuthModal] = useState(false);
  const [showSheetsConfig, setShowSheetsConfig] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('kota_refleksia_dark_mode') === 'true';
  });

  // Sync dark mode class on html/body element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('kota_refleksia_dark_mode', String(isDarkMode));
  }, [isDarkMode]);

  // Load initial environment & check existing user session
  useEffect(() => {
    const existing = api.getCurrentUser();
    if (existing) {
      setCurrentUser(existing);
    } else {
      api.getUsers().then(users => {
        const defaultStudent = users.find(u => u.id === 'SISWA01');
        if (defaultStudent) {
          setCurrentUser(defaultStudent);
          api.setCurrentUser(defaultStudent);
        }
      });
    }

    api.getBuildings().then(setBuildings);
    api.getUsers().then(users => {
      setOnlineUsers(users.filter(u => u.online));
    });

    // Initial chat load
    api.getChatMessages('all').then(setChatMessages);
  }, []);

  // Start peaceful ambient soundscape on first user gesture (to comply with browser autoplay)
  useEffect(() => {
    const handleFirstInteraction = () => {
      sounds.startPeacefulAmbient();
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };
    window.addEventListener('click', handleFirstInteraction);
    window.addEventListener('keydown', handleFirstInteraction);
    window.addEventListener('touchstart', handleFirstInteraction);

    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
      sounds.stopPeacefulAmbient();
    };
  }, []);

  // Real-Time Live Chat Subscription (Instant zero-delay sync across tabs and remote spreadsheet)
  useEffect(() => {
    const unsubscribe = api.subscribeToLiveChat((newMsg) => {
      setChatMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
    });

    // 3.5-second polling for Google Apps Script remote sync so students and teachers can chat in real-time
    const interval = setInterval(() => {
      api.syncRemoteChat().then((messages) => {
        if (messages && messages.length > 0) {
          setChatMessages(messages);
        }
      });
    }, 3500);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  // Handler when player finishes moving on isometric map
  const handlePlayerMove = (newPos: { x: number; y: number }) => {
    if (!currentUser) return;
    const updated = { ...currentUser, position: newPos };
    setCurrentUser(updated);
    api.setCurrentUser(updated);
  };

  // Handler when points change
  const handlePointsUpdated = (newPoints: number) => {
    if (!currentUser) return;
    const updated = { ...currentUser, points: newPoints };
    setCurrentUser(updated);
    api.setCurrentUser(updated);
  };

  // Handler for sending chat from bottom input pill
  const handleSendMessage = async (text: string) => {
    if (!currentUser) return;
    const { cleanText } = filterProfanity(text);

    // Show speech bubble over player avatar
    setPlayerSpeechText(cleanText.slice(0, 24));
    sounds.playPop();

    // Auto-clear speech bubble after 5 seconds
    setTimeout(() => {
      setPlayerSpeechText(undefined);
    }, 5000);

    const newMsg = await api.sendChatMessage({
      room: 'kafe',
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      text: cleanText,
    });

    setChatMessages(prev => [...prev, newMsg]);
  };

  const handleReportMessage = async (messageId: string) => {
    await api.reportChatMessage(messageId);
    api.getChatMessages('all').then(setChatMessages);
  };

  // Teacher Panel Unlock & Lock Handlers (Locked with Passcode 11001100)
  const handleOpenTeacherPanel = () => {
    if (isTeacherPanelUnlocked) {
      setShowTeacherPanel(true);
    } else {
      setShowTeacherAuthModal(true);
    }
  };

  const handleTeacherAuthSuccess = () => {
    setIsTeacherPanelUnlocked(true);
    setShowTeacherAuthModal(false);
    setShowTeacherPanel(true);
  };

  const handleLockTeacherPanel = () => {
    setIsTeacherPanelUnlocked(false);
    setShowTeacherPanel(false);
  };

  // Logout handler
  const handleLogout = () => {
    api.setCurrentUser(null);
    setCurrentUser(null);
    setSelectedBuilding(null);
    setActiveBuilding(null);
    setShowTeacherPanel(false);
    setIsTeacherPanelUnlocked(false);
  };

  // Login handler
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    api.setCurrentUser(user);
  };

  return (
    <div className={`relative w-screen h-screen overflow-hidden ${isDarkMode ? 'dark bg-[#060A14] text-slate-100' : 'bg-[#BAE6FD] text-slate-800'}`}>
      {/* Login Screen if no active session */}
      {!currentUser && (
        <LoginModal
          onLoginSuccess={handleLoginSuccess}
          isDarkMode={isDarkMode}
        />
      )}

      {/* Main Isometric World Stage */}
      {currentUser && (
        <>
          {/* Top HUD matching screenshot */}
          <HUD
            currentUser={currentUser}
            buildings={buildings}
            selectedBuilding={selectedBuilding}
            onEnterBuilding={(b) => setActiveBuilding(b)}
            onCloseBuildingInfo={() => setSelectedBuilding(null)}
            onOpenTeacherPanel={handleOpenTeacherPanel}
            onOpenSheetsConfig={() => setShowSheetsConfig(true)}
            onOpenNotifications={() => setShowNotifications(true)}
            onLogout={handleLogout}
            isDarkMode={isDarkMode}
            onToggleDarkMode={() => setIsDarkMode(prev => !prev)}
          />

          {/* Isometric 2.5D City Map Canvas with Walking Animation and touch card below buildings */}
          <main className="w-full h-full">
            <IsometricMap
              buildings={buildings}
              currentUser={currentUser}
              onlineUsers={onlineUsers}
              selectedBuilding={selectedBuilding}
              onSelectBuilding={(b) => setSelectedBuilding(b)}
              isDarkMode={isDarkMode}
              onPlayerMove={handlePlayerMove}
              playerSpeechText={playerSpeechText}
            />
          </main>

          {/* 
            Chat Layout matching screenshot:
            - Bottom-Left chat stream box (Obrolan · ruang 2 · 50 pesan)
            - Bottom-Center floating chat input pill (Ngobrol dengan warga di dekatmu)
          */}
          <BottomChatOverlay
            currentUser={currentUser}
            messages={chatMessages}
            onSendMessage={handleSendMessage}
            onReportMessage={handleReportMessage}
            isDarkMode={isDarkMode}
          />

          {/* Building Inside Modal Panel (4 Tabs + Special Functions) */}
          {activeBuilding && (
            <BuildingModal
              building={activeBuilding}
              currentUser={currentUser}
              onClose={() => setActiveBuilding(null)}
              onPointsUpdated={handlePointsUpdated}
              isDarkMode={isDarkMode}
            />
          )}

          {/* Teacher Management Dashboard (For Guru Role) */}
          {showTeacherPanel && (
            <TeacherDashboard
              currentUser={currentUser}
              buildings={buildings}
              onClose={() => setShowTeacherPanel(false)}
              onLockPanel={handleLockTeacherPanel}
              isDarkMode={isDarkMode}
              onRefreshData={() => {
                api.getBuildings().then(setBuildings);
                const updated = api.getCurrentUser();
                if (updated) setCurrentUser(updated);
              }}
            />
          )}

          {/* Teacher Passcode Authentication Modal ("11001100") */}
          {showTeacherAuthModal && (
            <TeacherAuthModal
              isOpen={showTeacherAuthModal}
              onSuccess={handleTeacherAuthSuccess}
              onClose={() => setShowTeacherAuthModal(false)}
              isDarkMode={isDarkMode}
            />
          )}

          {/* Google Spreadsheet Sync & Setup Guide Modal */}
          {showSheetsConfig && (
            <SheetsConfigModal
              onClose={() => setShowSheetsConfig(false)}
              isDarkMode={isDarkMode}
            />
          )}

          {/* Notifications & Roadmap Modal */}
          {showNotifications && (
            <NotificationManager
              onClose={() => setShowNotifications(false)}
              isDarkMode={isDarkMode}
            />
          )}
        </>
      )}
    </div>
  );
}
