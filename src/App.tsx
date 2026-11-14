/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {useCallback, useEffect, useMemo, useState} from 'react';
import {Loader2} from 'lucide-react';
import {AdminCurriculumManager} from './components/admin/AdminCurriculumManager';
import {AdminDashboard} from './components/admin/AdminDashboard';
import {AdminMaterialsManager} from './components/admin/AdminMaterialsManager';
import {AdminQuizManager} from './components/admin/AdminQuizManager';
import {AdminStudentsReport} from './components/admin/AdminStudentsReport';
import {AuthPortal} from './components/auth/AuthPortal';
import {AppShell, type NavRoute} from './components/layout/AppShell';
import {UserProfileView} from './components/profile/UserProfileView';
import {ModulesCatalog} from './components/student/ModulesCatalog';
import {QuizRunner} from './components/student/QuizRunner';
import {QuizzesHub} from './components/student/QuizzesHub';
import {StudentDashboard} from './components/student/StudentDashboard';
import {StudentProgressView} from './components/student/StudentProgressView';
import {TopicWorkspace} from './components/student/TopicWorkspace';
import {AuthProvider, useAuth} from './context/AuthContext';
import {
  fetchActivityLogs,
  fetchLearningProgress,
  fetchModules,
  fetchQuizzes,
  fetchStudentQuizAttempts,
  fetchTopics,
} from './services/learningService';
import type {
  ActivityLog,
  LearningModule,
  LearningProgress,
  Quiz,
  QuizAttempt,
  Topic,
} from './types/database';

function AuthenticatedWorkspace() {
  const {profile, user, isAdminUser, signOut} = useAuth();
  const isAdmin = isAdminUser || profile?.role === 'ADMIN';

  const [route, setRoute] = useState<NavRoute>('dashboard');
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);

  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [modules, setModules] = useState<LearningModule[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [progress, setProgress] = useState<LearningProgress[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  const loadStudentWorkspace = useCallback(async () => {
    if (!user) return;
    setLoadingData(true);
    setDataError(null);
    try {
      const [mods, tops, qzs, prog, atts, logs] = await Promise.all([
        fetchModules(false),
        fetchTopics(undefined, false),
        fetchQuizzes({includeDrafts: false}),
        fetchLearningProgress(user.uid),
        fetchStudentQuizAttempts(user.uid),
        fetchActivityLogs(user.uid, 15),
      ]);
      setModules(mods);
      setTopics(tops);
      setQuizzes(qzs);
      setProgress(prog);
      setAttempts(atts);
      setActivityLogs(logs);
    } catch (err) {
      setDataError(
        err instanceof Error
          ? err.message
          : 'Gagal memuatkan data daripada Cloud Firestore.'
      );
    } finally {
      setLoadingData(false);
    }
  }, [user]);

  useEffect(() => {
    loadStudentWorkspace();
  }, [loadStudentWorkspace]);

  const progressMap = useMemo(() => {
    const map: Record<string, LearningProgress> = {};
    for (const item of progress) {
      map[item.topic_id] = item;
    }
    return map;
  }, [progress]);

  if (profile && !profile.is_active) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center">
          <h1 className="text-xl font-bold text-slate-900">Akaun Dinyahaktifkan</h1>
          <p className="mt-2 text-sm text-slate-600">
            Akaun anda sedang dinyahaktifkan oleh pentadbir sistem. Sila hubungi pihak
            Admin I-KNOW untuk maklumat lanjut.
          </p>
          <button
            type="button"
            onClick={() => signOut()}
            className="mt-6 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white"
          >
            Log Keluar
          </button>
        </div>
      </div>
    );
  }

  const handleNavigate = (next: NavRoute) => {
    setRoute(next);
    setActiveTopicId(null);
    setActiveModuleId(null);
    setActiveQuizId(null);
  };

  const handleSelectTopic = (moduleId: string, topicId: string) => {
    setActiveModuleId(moduleId);
    setActiveTopicId(topicId);
    setActiveQuizId(null);
    setRoute('modules');
  };

  const handleStartQuiz = (quizId: string) => {
    setActiveQuizId(quizId);
    setRoute('quizzes');
  };

  const breadcrumbLabel = (() => {
    if (activeQuizId) return 'Menjawab Kuiz';
    if (activeTopicId) return 'Ruang Pembelajaran Topik';
    switch (route) {
      case 'dashboard':
        return isAdmin ? 'Dashboard Pentadbir' : 'Papan Pemuka Pelajar';
      case 'modules':
        return 'Modul Pembelajaran';
      case 'quizzes':
        return 'Kuiz Interaktif';
      case 'progress':
        return 'Rekod Kemajuan';
      case 'profile':
        return 'Profil Pengguna';
      case 'admin-curriculum':
        return 'Pengurusan Modul & Topik';
      case 'admin-materials':
        return 'Pengurusan Bahan Pembelajaran';
      case 'admin-quizzes':
        return 'Pengurusan Kuiz';
      case 'admin-students':
        return 'Rekod Kemajuan Pelajar';
    }
  })();

  const renderBody = () => {
    if (activeQuizId) {
      return (
        <QuizRunner
          quizId={activeQuizId}
          onBack={() => setActiveQuizId(null)}
          onCompleted={loadStudentWorkspace}
        />
      );
    }

    if (route === 'modules' && activeModuleId && activeTopicId) {
      const mod = modules.find((m) => m.id === activeModuleId);
      const modTopics = topics.filter((t) => t.module_id === activeModuleId);
      if (mod) {
        return (
          <TopicWorkspace
            module={mod}
            topics={modTopics}
            initialTopicId={activeTopicId}
            progressMap={progressMap}
            onProgressUpdated={loadStudentWorkspace}
            onStartQuiz={handleStartQuiz}
            onBack={() => {
              setActiveTopicId(null);
              setActiveModuleId(null);
            }}
          />
        );
      }
    }

    if (route === 'profile') {
      return <UserProfileView />;
    }

    if (isAdmin) {
      if (route === 'dashboard') return <AdminDashboard onNavigate={handleNavigate} />;
      if (route === 'admin-curriculum') return <AdminCurriculumManager />;
      if (route === 'admin-materials') return <AdminMaterialsManager />;
      if (route === 'admin-quizzes') return <AdminQuizManager />;
      if (route === 'admin-students') return <AdminStudentsReport />;
    }

    if (loadingData) {
      return (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-16 text-sm text-slate-600">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />
          Memuatkan kandungan pembelajaran I-KNOW...
        </div>
      );
    }

    if (dataError) {
      return (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800 space-y-2">
          <p className="font-semibold">Ralat Capaian Data</p>
          <p>{dataError}</p>
        </div>
      );
    }

    if (route === 'modules') {
      return (
        <ModulesCatalog
          modules={modules}
          topics={topics}
          progressMap={progressMap}
          onSelectTopic={handleSelectTopic}
        />
      );
    }

    if (route === 'quizzes') {
      return (
        <QuizzesHub
          modules={modules}
          quizzes={quizzes}
          attempts={attempts}
          onStartQuiz={handleStartQuiz}
        />
      );
    }

    if (isAdmin && route === 'progress') {
      return (
        <StudentProgressView
          modules={modules}
          topics={topics}
          quizzes={quizzes}
          progressMap={progressMap}
          attempts={attempts}
          activityLogs={activityLogs}
          onSelectTopic={handleSelectTopic}
        />
      );
    }

    return (
      <StudentDashboard
        modules={modules}
        topics={topics}
        quizzes={quizzes}
        progressMap={progressMap}
        attempts={attempts}
        activityLogs={activityLogs}
        onOpenModules={() => handleNavigate('modules')}
        onSelectTopic={handleSelectTopic}
        onStartQuiz={handleStartQuiz}
      />
    );
  };

  return (
    <AppShell activeRoute={route} onNavigate={handleNavigate} breadcrumb={breadcrumbLabel}>
      {renderBody()}
    </AppShell>
  );
}

function RootRouter() {
  const {user, profile, loading} = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3 text-sm text-slate-600">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-700" />
        <span>Mengesahkan sesi I-KNOW...</span>
      </div>
    );
  }

  if (!user || !profile) {
    return <AuthPortal />;
  }

  return <AuthenticatedWorkspace />;
}

export default function App() {
  return (
    <AuthProvider>
      <RootRouter />
    </AuthProvider>
  );
}
