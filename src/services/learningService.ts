import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {db, handleFirestoreError, OperationType} from '../lib/firebase';
import {hasBase64Media} from '../lib/noteTemplates';
import {deleteStorageFile} from './storageService';
import type {
  ActivityLog,
  ContentBlock,
  LearningModule,
  LearningProgress,
  Material,
  MaterialType,
  Profile,
  PublishStatus,
  QuestionType,
  Quiz,
  QuizAttempt,
  QuizOption,
  QuizQuestion,
  QuizWithQuestions,
  Subtopic,
  Topic,
  UserRole,
} from '../types/database';

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function makeId(prefix: string): string {
  const rand =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 16)
      : `${Date.now()}${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${rand}`;
}

function toIso(val: unknown): string {
  if (val instanceof Timestamp) return val.toDate().toISOString();
  if (typeof val === 'string') return val;
  return new Date().toISOString();
}

function mapDoc<T>(id: string, raw: Record<string, unknown>): T {
  return {
    ...raw,
    id,
    created_at: toIso(raw.created_at),
    updated_at: toIso(raw.updated_at),
  } as T;
}

// =============================================================================
// MODUL, TOPIK, SUBTOPIK & BLOK KANDUNGAN
// =============================================================================

export async function fetchModules(includeDrafts = false): Promise<LearningModule[]> {
  const path = 'modules';
  try {
    const colRef = collection(db, path);
    const q = includeDrafts ? colRef : query(colRef, where('status', '==', 'Published'));
    const snap = await getDocs(q);
    const list = snap.docs.map((d) =>
      mapDoc<LearningModule>(d.id, d.data() as Record<string, unknown>)
    );
    return list.sort((a, b) => a.sort_order - b.sort_order);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function upsertModule(payload: {
  id?: string;
  code: string;
  title: string;
  slug: string;
  description: string;
  icon_name: string;
  sort_order: number;
  status: PublishStatus;
  created_by?: string | null;
}): Promise<LearningModule> {
  const id = payload.id || makeId('mod');
  const docPath = `modules/${id}`;
  const docRef = doc(db, 'modules', id);

  try {
    const baseData = {
      id,
      code: payload.code.trim().slice(0, 40),
      title: payload.title.trim().slice(0, 160),
      slug: payload.slug.trim().slice(0, 160),
      description: payload.description.trim().slice(0, 1200),
      icon_name: payload.icon_name.slice(0, 50),
      sort_order: Math.max(1, Math.min(1000, Math.round(payload.sort_order || 1))),
      status: payload.status,
      created_by: payload.created_by ?? null,
    };

    if (payload.id) {
      await updateDoc(docRef, {
        ...baseData,
        updated_at: serverTimestamp(),
      });
    } else {
      await setDoc(docRef, {
        ...baseData,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
    }
    const saved = await getDoc(docRef);
    return mapDoc<LearningModule>(saved.id, saved.data() as Record<string, unknown>);
  } catch (error) {
    handleFirestoreError(error, payload.id ? OperationType.UPDATE : OperationType.CREATE, docPath);
  }
}

export async function deleteModule(moduleId: string): Promise<void> {
  const docPath = `modules/${moduleId}`;
  try {
    await deleteDoc(doc(db, 'modules', moduleId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

export async function fetchTopics(
  moduleId?: string,
  includeDrafts = false
): Promise<Topic[]> {
  const path = 'topics';
  try {
    const colRef = collection(db, path);
    const q = includeDrafts ? colRef : query(colRef, where('status', '==', 'Published'));
    const snap = await getDocs(q);
    let list = snap.docs.map((d) => {
      const mapped = mapDoc<Topic>(d.id, d.data() as Record<string, unknown>);
      return {
        ...mapped,
        learning_objectives: Array.isArray(mapped.learning_objectives)
          ? mapped.learning_objectives
          : [],
      };
    });
    if (moduleId) {
      list = list.filter((t) => t.module_id === moduleId);
    }
    return list.sort((a, b) => a.sort_order - b.sort_order);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveTopic(payload: {
  id?: string;
  module_id: string;
  title: string;
  slug: string;
  description: string;
  learning_objectives: string[];
  sort_order: number;
  estimated_minutes: number;
  status: PublishStatus;
}): Promise<Topic> {
  const id = payload.id || makeId('top');
  const docPath = `topics/${id}`;
  const docRef = doc(db, 'topics', id);

  try {
    const cleanObjectives = (payload.learning_objectives || [])
      .map((s) => s.trim().slice(0, 300))
      .filter(Boolean)
      .slice(0, 20);

    const baseData = {
      id,
      module_id: payload.module_id,
      title: payload.title.trim().slice(0, 200),
      slug: payload.slug.trim().slice(0, 200),
      description: payload.description.trim().slice(0, 1500),
      learning_objectives: cleanObjectives,
      sort_order: Math.max(1, Math.min(1000, Math.round(payload.sort_order || 1))),
      estimated_minutes: Math.max(1, Math.min(600, Math.round(payload.estimated_minutes || 15))),
      status: payload.status,
    };

    if (payload.id) {
      await updateDoc(docRef, {
        ...baseData,
        updated_at: serverTimestamp(),
      });
    } else {
      await setDoc(docRef, {
        ...baseData,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
    }
    const saved = await getDoc(docRef);
    return mapDoc<Topic>(saved.id, saved.data() as Record<string, unknown>);
  } catch (error) {
    handleFirestoreError(error, payload.id ? OperationType.UPDATE : OperationType.CREATE, docPath);
  }
}

export async function deleteTopic(topicId: string): Promise<void> {
  const docPath = `topics/${topicId}`;
  try {
    await deleteDoc(doc(db, 'topics', topicId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

export async function fetchSubtopics(
  topicId: string,
  includeDrafts = false
): Promise<Subtopic[]> {
  const path = 'subtopics';
  try {
    const colRef = collection(db, path);
    const q = includeDrafts
      ? query(colRef, where('topic_id', '==', topicId))
      : query(colRef, where('status', '==', 'Published'));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => mapDoc<Subtopic>(d.id, d.data() as Record<string, unknown>))
      .filter((s) => s.topic_id === topicId)
      .sort((a, b) => a.sort_order - b.sort_order);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveSubtopic(payload: {
  id?: string;
  topic_id: string;
  title: string;
  summary: string;
  sort_order: number;
  status: PublishStatus;
}): Promise<Subtopic> {
  const id = payload.id || makeId('sub');
  const docPath = `subtopics/${id}`;
  const docRef = doc(db, 'subtopics', id);

  try {
    const baseData = {
      id,
      topic_id: payload.topic_id,
      title: payload.title.trim().slice(0, 200),
      summary: payload.summary.trim().slice(0, 1000),
      sort_order: Math.max(1, Math.min(1000, Math.round(payload.sort_order || 1))),
      status: payload.status,
    };
    if (payload.id) {
      await updateDoc(docRef, {
        ...baseData,
        updated_at: serverTimestamp(),
      });
    } else {
      await setDoc(docRef, {
        ...baseData,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
    }
    const saved = await getDoc(docRef);
    return mapDoc<Subtopic>(saved.id, saved.data() as Record<string, unknown>);
  } catch (error) {
    handleFirestoreError(error, payload.id ? OperationType.UPDATE : OperationType.CREATE, docPath);
  }
}

export async function deleteSubtopic(subtopicId: string): Promise<void> {
  const docPath = `subtopics/${subtopicId}`;
  try {
    await deleteDoc(doc(db, 'subtopics', subtopicId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

export async function fetchContentBlocks(
  topicId: string,
  includeDrafts = false
): Promise<ContentBlock[]> {
  const path = 'content_blocks';
  try {
    const colRef = collection(db, path);
    const q = includeDrafts
      ? query(colRef, where('topic_id', '==', topicId))
      : query(colRef, where('status', '==', 'Published'));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => mapDoc<ContentBlock>(d.id, d.data() as Record<string, unknown>))
      .filter((b) => b.topic_id === topicId)
      .sort((a, b) => a.sort_order - b.sort_order);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveContentBlock(payload: {
  id?: string;
  topic_id: string;
  subtopic_id: string | null;
  block_type: ContentBlock['block_type'];
  title: string;
  body: string;
  arabic_text: string | null;
  transliteration: string | null;
  translation: string | null;
  sort_order: number;
  status: PublishStatus;
}): Promise<ContentBlock> {
  const id = payload.id || makeId('blk');
  const docPath = `content_blocks/${id}`;
  const docRef = doc(db, 'content_blocks', id);

  if (hasBase64Media(payload.body)) {
    throw new Error(
      'Fail imej atau video dalam bentuk Base64 tidak dibenarkan dalam Firestore.'
    );
  }

  try {
    const baseData = {
      id,
      topic_id: payload.topic_id,
      subtopic_id: payload.subtopic_id || null,
      block_type: payload.block_type,
      title: payload.title.trim().slice(0, 200),
      body: payload.body.trim().slice(0, 8000),
      arabic_text: payload.arabic_text ? payload.arabic_text.trim().slice(0, 2000) : null,
      transliteration: payload.transliteration
        ? payload.transliteration.trim().slice(0, 1000)
        : null,
      translation: payload.translation ? payload.translation.trim().slice(0, 2000) : null,
      sort_order: Math.max(1, Math.min(1000, Math.round(payload.sort_order || 1))),
      status: payload.status,
    };
    if (payload.id) {
      await updateDoc(docRef, {
        ...baseData,
        updated_at: serverTimestamp(),
      });
    } else {
      await setDoc(docRef, {
        ...baseData,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
    }
    const saved = await getDoc(docRef);
    return mapDoc<ContentBlock>(saved.id, saved.data() as Record<string, unknown>);
  } catch (error) {
    handleFirestoreError(error, payload.id ? OperationType.UPDATE : OperationType.CREATE, docPath);
  }
}

export async function deleteContentBlock(blockId: string): Promise<void> {
  const docPath = `content_blocks/${blockId}`;
  try {
    await deleteDoc(doc(db, 'content_blocks', blockId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

// =============================================================================
// BAHAN PEMBELAJARAN (PAUTAN URL & YOUTUBE TANPA FIREBASE STORAGE)
// =============================================================================

export async function fetchMaterials(filters?: {
  moduleId?: string;
  topicId?: string;
  includeDrafts?: boolean;
}): Promise<Material[]> {
  const path = 'materials';
  try {
    const colRef = collection(db, path);
    const q = filters?.includeDrafts
      ? colRef
      : query(colRef, where('status', '==', 'Published'));
    const snap = await getDocs(q);
    let list = snap.docs.map((d) =>
      mapDoc<Material>(d.id, d.data() as Record<string, unknown>)
    );
    if (filters?.moduleId) {
      list = list.filter((m) => m.module_id === filters.moduleId);
    }
    if (filters?.topicId) {
      list = list.filter((m) => m.topic_id === filters.topicId);
    }
    return list.sort((a, b) => b.created_at.localeCompare(a.created_at));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveMaterial(payload: {
  id?: string;
  module_id: string;
  topic_id: string;
  subtopic_id: string | null;
  title: string;
  description: string;
  material_type: MaterialType;
  storage_path: string | null;
  file_url: string | null;
  youtube_url: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  status: PublishStatus;
  uploaded_by?: string | null;
}): Promise<Material> {
  const id = payload.id || makeId('mat');
  const docPath = `materials/${id}`;
  const docRef = doc(db, 'materials', id);

  try {
    const baseData = {
      id,
      module_id: payload.module_id,
      topic_id: payload.topic_id,
      subtopic_id: payload.subtopic_id || null,
      title: payload.title.trim().slice(0, 200),
      description: payload.description.trim().slice(0, 1000),
      material_type: payload.material_type,
      storage_path: payload.storage_path ? payload.storage_path.slice(0, 400) : null,
      file_url: payload.file_url ? payload.file_url.trim().slice(0, 1000) : null,
      youtube_url: payload.youtube_url ? payload.youtube_url.trim().slice(0, 500) : null,
      mime_type: payload.mime_type ? payload.mime_type.slice(0, 120) : null,
      file_size_bytes: payload.file_size_bytes ?? null,
      status: payload.status,
      uploaded_by: payload.uploaded_by ?? null,
    };

    if (payload.id) {
      await updateDoc(docRef, {
        ...baseData,
        updated_at: serverTimestamp(),
      });
    } else {
      await setDoc(docRef, {
        ...baseData,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
    }
    const saved = await getDoc(docRef);
    return mapDoc<Material>(saved.id, saved.data() as Record<string, unknown>);
  } catch (error) {
    handleFirestoreError(error, payload.id ? OperationType.UPDATE : OperationType.CREATE, docPath);
  }
}

export async function deleteMaterial(material: Material): Promise<void> {
  const docPath = `materials/${material.id}`;
  try {
    await deleteDoc(doc(db, 'materials', material.id));
    if (material.storage_path) {
      await deleteStorageFile(material.storage_path);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

// =============================================================================
// SISTEM KUIZ, SOALAN, PILIHAN & PERCUBAAN
// =============================================================================

export async function fetchQuizzes(filters?: {
  moduleId?: string;
  topicId?: string;
  includeDrafts?: boolean;
}): Promise<Quiz[]> {
  const path = 'quizzes';
  try {
    const colRef = collection(db, path);
    const q = filters?.includeDrafts
      ? colRef
      : query(colRef, where('status', '==', 'Published'));
    const snap = await getDocs(q);
    let list = snap.docs.map((d) => mapDoc<Quiz>(d.id, d.data() as Record<string, unknown>));
    if (filters?.moduleId) {
      list = list.filter((qz) => qz.module_id === filters.moduleId);
    }
    if (filters?.topicId) {
      list = list.filter((qz) => qz.topic_id === filters.topicId);
    }
    return list.sort((a, b) => b.created_at.localeCompare(a.created_at));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function fetchQuizWithQuestions(
  quizId: string,
  includeDrafts = false
): Promise<QuizWithQuestions> {
  try {
    const quizSnap = await getDoc(doc(db, 'quizzes', quizId));
    if (!quizSnap.exists()) {
      throw new Error('Kuiz tidak ditemui.');
    }
    const quiz = mapDoc<Quiz>(quizSnap.id, quizSnap.data() as Record<string, unknown>);

    const qCol = collection(db, 'questions');
    const qQuery = includeDrafts
      ? query(qCol, where('quiz_id', '==', quizId))
      : query(qCol, where('quiz_status', '==', 'Published'));
    const qSnap = await getDocs(qQuery);
    const questions = qSnap.docs
      .map((d) => mapDoc<QuizQuestion>(d.id, d.data() as Record<string, unknown>))
      .filter((item) => item.quiz_id === quizId)
      .sort((a, b) => a.sort_order - b.sort_order);

    const optCol = collection(db, 'quiz_options');
    const optQuery = includeDrafts
      ? query(optCol, where('quiz_id', '==', quizId))
      : query(optCol, where('quiz_status', '==', 'Published'));
    const optSnap = await getDocs(optQuery);
    const allOptions = optSnap.docs
      .map((d) => mapDoc<QuizOption>(d.id, d.data() as Record<string, unknown>))
      .filter((opt) => opt.quiz_id === quizId);

    const hydratedQuestions = questions.map((qs) => ({
      ...qs,
      quiz_options: allOptions
        .filter((o) => o.question_id === qs.id)
        .sort((a, b) => a.sort_order - b.sort_order),
    }));

    return {
      ...quiz,
      questions: hydratedQuestions,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `quizzes/${quizId}`);
  }
}

export async function saveQuiz(payload: {
  id?: string;
  module_id: string;
  topic_id: string | null;
  title: string;
  description: string;
  passing_score: number;
  allow_retake: boolean;
  max_attempts: number | null;
  time_limit_minutes: number | null;
  status: PublishStatus;
  created_by?: string | null;
}): Promise<Quiz> {
  const id = payload.id || makeId('quiz');
  const docPath = `quizzes/${id}`;
  const docRef = doc(db, 'quizzes', id);

  try {
    const baseData = {
      id,
      module_id: payload.module_id,
      topic_id: payload.topic_id || null,
      title: payload.title.trim().slice(0, 200),
      description: payload.description.trim().slice(0, 1000),
      passing_score: Math.max(0, Math.min(100, Math.round(payload.passing_score || 70))),
      allow_retake: Boolean(payload.allow_retake),
      max_attempts: payload.max_attempts ? Math.max(1, Math.round(payload.max_attempts)) : null,
      time_limit_minutes: payload.time_limit_minutes
        ? Math.max(1, Math.round(payload.time_limit_minutes))
        : null,
      status: payload.status,
      created_by: payload.created_by ?? null,
    };

    if (payload.id) {
      await updateDoc(docRef, {
        ...baseData,
        updated_at: serverTimestamp(),
      });
      // Selaraskan quiz_status pada soalan dan pilihan jawapan
      const [qSnap, optSnap] = await Promise.all([
        getDocs(query(collection(db, 'questions'), where('quiz_id', '==', id))),
        getDocs(query(collection(db, 'quiz_options'), where('quiz_id', '==', id))),
      ]);
      const batch = writeBatch(db);
      qSnap.docs.forEach((d) =>
        batch.update(d.ref, {quiz_status: payload.status, updated_at: serverTimestamp()})
      );
      optSnap.docs.forEach((d) =>
        batch.update(d.ref, {quiz_status: payload.status, updated_at: serverTimestamp()})
      );
      await batch.commit();
    } else {
      await setDoc(docRef, {
        ...baseData,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
    }
    const saved = await getDoc(docRef);
    return mapDoc<Quiz>(saved.id, saved.data() as Record<string, unknown>);
  } catch (error) {
    handleFirestoreError(error, payload.id ? OperationType.UPDATE : OperationType.CREATE, docPath);
  }
}

export async function deleteQuiz(quizId: string): Promise<void> {
  const docPath = `quizzes/${quizId}`;
  try {
    const [qSnap, optSnap] = await Promise.all([
      getDocs(query(collection(db, 'questions'), where('quiz_id', '==', quizId))),
      getDocs(query(collection(db, 'quiz_options'), where('quiz_id', '==', quizId))),
    ]);
    const batch = writeBatch(db);
    optSnap.docs.forEach((d) => batch.delete(d.ref));
    qSnap.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(doc(db, 'quizzes', quizId));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

export async function saveQuestionWithOptions(payload: {
  id?: string;
  quiz_id: string;
  quiz_status: PublishStatus;
  question_type: QuestionType;
  prompt: string;
  arabic_prompt: string | null;
  explanation: string;
  points: number;
  sort_order: number;
  options: Array<{
    option_text: string;
    match_target: string | null;
    is_correct: boolean;
    sort_order: number;
  }>;
}): Promise<QuizQuestion> {
  const qId = payload.id || makeId('qst');
  const qRef = doc(db, 'questions', qId);

  try {
    const qBase = {
      id: qId,
      quiz_id: payload.quiz_id,
      quiz_status: payload.quiz_status,
      question_type: payload.question_type,
      prompt: payload.prompt.trim().slice(0, 1000),
      arabic_prompt: payload.arabic_prompt ? payload.arabic_prompt.trim().slice(0, 1000) : null,
      explanation: payload.explanation.trim().slice(0, 1500),
      points: Math.max(1, Math.min(1000, Math.round(payload.points || 10))),
      sort_order: Math.max(1, Math.min(1000, Math.round(payload.sort_order || 1))),
    };

    if (payload.id) {
      await updateDoc(qRef, {
        ...qBase,
        updated_at: serverTimestamp(),
      });
      const oldOpts = await getDocs(
        query(collection(db, 'quiz_options'), where('question_id', '==', qId))
      );
      const delBatch = writeBatch(db);
      oldOpts.docs.forEach((d) => delBatch.delete(d.ref));
      await delBatch.commit();
    } else {
      await setDoc(qRef, {
        ...qBase,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
    }

    if (payload.options.length > 0) {
      const optBatch = writeBatch(db);
      payload.options.forEach((o, idx) => {
        const optId = makeId('opt');
        optBatch.set(doc(db, 'quiz_options', optId), {
          id: optId,
          quiz_id: payload.quiz_id,
          question_id: qId,
          quiz_status: payload.quiz_status,
          option_text: o.option_text.trim().slice(0, 500),
          match_target: o.match_target ? o.match_target.trim().slice(0, 500) : null,
          is_correct: Boolean(o.is_correct),
          sort_order: o.sort_order ?? idx + 1,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        });
      });
      await optBatch.commit();
    }

    const saved = await getDoc(qRef);
    return mapDoc<QuizQuestion>(saved.id, saved.data() as Record<string, unknown>);
  } catch (error) {
    handleFirestoreError(
      error,
      payload.id ? OperationType.UPDATE : OperationType.CREATE,
      `questions/${qId}`
    );
  }
}

export async function deleteQuestion(questionId: string): Promise<void> {
  try {
    const oldOpts = await getDocs(
      query(collection(db, 'quiz_options'), where('question_id', '==', questionId))
    );
    const batch = writeBatch(db);
    oldOpts.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(doc(db, 'questions', questionId));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `questions/${questionId}`);
  }
}

export async function fetchStudentQuizAttempts(
  studentId: string,
  quizId?: string
): Promise<QuizAttempt[]> {
  const path = 'quiz_attempts';
  try {
    const q = query(collection(db, path), where('student_id', '==', studentId));
    const snap = await getDocs(q);
    let list = snap.docs.map((d) =>
      mapDoc<QuizAttempt>(d.id, d.data() as Record<string, unknown>)
    );
    if (quizId) {
      list = list.filter((a) => a.quiz_id === quizId);
    }
    return list.sort((a, b) => b.completed_at.localeCompare(a.completed_at));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export interface QuizSubmissionInput {
  quiz: QuizWithQuestions;
  studentId: string;
  startedAt: string;
  selectedOptionByQuestion: Record<string, string>;
  matchingByQuestion: Record<string, Record<string, string>>;
}

export interface GradedQuizResult {
  attempt: QuizAttempt;
  questionResults: Array<{
    question: QuizQuestion;
    isCorrect: boolean;
    pointsEarned: number;
    selectedOptionId: string | null;
    submittedMatching?: Record<string, string>;
  }>;
}

export async function submitQuizAttempt(
  input: QuizSubmissionInput
): Promise<GradedQuizResult> {
  const {quiz, studentId, startedAt, selectedOptionByQuestion, matchingByQuestion} = input;

  let totalPoints = 0;
  let earnedPoints = 0;

  const questionResults = quiz.questions.map((question) => {
    totalPoints += question.points;
    const opts = question.quiz_options ?? [];

    if (question.question_type === 'matching') {
      const userMap = matchingByQuestion[question.id] ?? {};
      const allCorrect =
        opts.length > 0 &&
        opts.every(
          (opt) => (userMap[opt.id] ?? '').trim() === (opt.match_target ?? '').trim()
        );
      const pts = allCorrect ? question.points : 0;
      earnedPoints += pts;
      return {
        question,
        isCorrect: allCorrect,
        pointsEarned: pts,
        selectedOptionId: null,
        submittedMatching: userMap,
      };
    }

    const chosenId = selectedOptionByQuestion[question.id] ?? null;
    const chosenOpt = opts.find((o) => o.id === chosenId);
    const isCorrect = Boolean(chosenOpt?.is_correct);
    const pts = isCorrect ? question.points : 0;
    earnedPoints += pts;

    return {
      question,
      isCorrect,
      pointsEarned: pts,
      selectedOptionId: chosenId,
    };
  });

  const score =
    totalPoints > 0 ? Number(((earnedPoints / totalPoints) * 100).toFixed(2)) : 0;
  const passed = score >= quiz.passing_score;
  const completedAtIso = new Date().toISOString();
  const attemptId = makeId('att');

  try {
    const batch = writeBatch(db);
    const attemptRef = doc(db, 'quiz_attempts', attemptId);
    batch.set(attemptRef, {
      id: attemptId,
      quiz_id: quiz.id,
      student_id: studentId,
      score,
      total_points: totalPoints,
      earned_points: earnedPoints,
      passed,
      started_at: startedAt.slice(0, 40),
      completed_at: completedAtIso,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });

    for (const qr of questionResults) {
      const ansId = makeId('ans');
      batch.set(doc(db, 'quiz_answers', ansId), {
        id: ansId,
        attempt_id: attemptId,
        student_id: studentId,
        question_id: qr.question.id,
        selected_option_id: qr.selectedOptionId,
        submitted_answer: qr.submittedMatching
          ? {matching: qr.submittedMatching}
          : {option_id: qr.selectedOptionId},
        is_correct: qr.isCorrect,
        points_earned: qr.pointsEarned,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
    }

    await batch.commit();

    await logActivity({
      userId: studentId,
      moduleId: quiz.module_id,
      topicId: quiz.topic_id,
      quizId: quiz.id,
      actionType: 'QUIZ_COMPLETED',
      description: `Menyelesaikan ${quiz.title} dengan markah ${score}% (${
        passed ? 'Lulus' : 'Cuba Lagi'
      })`,
      metadata: {score, passed, attempt_id: attemptId},
    });

    const savedAttempt: QuizAttempt = {
      id: attemptId,
      quiz_id: quiz.id,
      student_id: studentId,
      score,
      total_points: totalPoints,
      earned_points: earnedPoints,
      passed,
      started_at: startedAt,
      completed_at: completedAtIso,
      created_at: completedAtIso,
      updated_at: completedAtIso,
    };

    return {
      attempt: savedAttempt,
      questionResults,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `quiz_attempts/${attemptId}`);
  }
}

// =============================================================================
// REKOD KEMAJUAN & LOG AKTIVITI
// =============================================================================

export async function fetchLearningProgress(studentId: string): Promise<LearningProgress[]> {
  const path = 'learning_progress';
  try {
    const q = query(collection(db, path), where('student_id', '==', studentId));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => mapDoc<LearningProgress>(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => b.last_accessed_at.localeCompare(a.last_accessed_at));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function recordTopicProgress(params: {
  studentId: string;
  moduleId: string;
  topicId: string;
  topicTitle: string;
  isCompleted: boolean;
}): Promise<LearningProgress> {
  const progressId = `${params.studentId}_${params.topicId}`;
  const docRef = doc(db, 'learning_progress', progressId);
  const nowIso = new Date().toISOString();

  try {
    const existingSnap = await getDoc(docRef);
    if (existingSnap.exists()) {
      await updateDoc(docRef, {
        is_completed: params.isCompleted,
        completion_percent: params.isCompleted ? 100 : 50,
        last_accessed_at: nowIso,
        completed_at: params.isCompleted ? nowIso : null,
        updated_at: serverTimestamp(),
      });
    } else {
      await setDoc(docRef, {
        id: progressId,
        student_id: params.studentId,
        module_id: params.moduleId,
        topic_id: params.topicId,
        subtopic_id: null,
        is_completed: params.isCompleted,
        completion_percent: params.isCompleted ? 100 : 50,
        last_accessed_at: nowIso,
        completed_at: params.isCompleted ? nowIso : null,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
    }

    await logActivity({
      userId: params.studentId,
      moduleId: params.moduleId,
      topicId: params.topicId,
      actionType: params.isCompleted ? 'TOPIC_COMPLETED' : 'TOPIC_VISITED',
      description: params.isCompleted
        ? `Menandakan topik "${params.topicTitle}" sebagai selesai`
        : `Membuka topik "${params.topicTitle}"`,
    });

    const saved = await getDoc(docRef);
    return mapDoc<LearningProgress>(saved.id, saved.data() as Record<string, unknown>);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `learning_progress/${progressId}`);
  }
}

export async function logActivity(params: {
  userId: string;
  moduleId?: string | null;
  topicId?: string | null;
  quizId?: string | null;
  actionType: string;
  description: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const logId = makeId('log');
  try {
    await setDoc(doc(db, 'activity_logs', logId), {
      id: logId,
      user_id: params.userId,
      module_id: params.moduleId ?? null,
      topic_id: params.topicId ?? null,
      quiz_id: params.quizId ?? null,
      action_type: params.actionType.slice(0, 80),
      description: params.description.slice(0, 500),
      metadata: params.metadata ?? {},
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `activity_logs/${logId}`);
  }
}

export async function fetchActivityLogs(
  userId?: string,
  limitCount = 20
): Promise<ActivityLog[]> {
  const path = 'activity_logs';
  try {
    const colRef = collection(db, path);
    const q = userId ? query(colRef, where('user_id', '==', userId)) : colRef;
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => mapDoc<ActivityLog>(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limitCount);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

// =============================================================================
// FUNGSI PENTADBIRAN (ADMIN) & PERMULAAN KURIKULUM FIRESTORE
// =============================================================================

export async function fetchAdminDashboardOverview(): Promise<{
  profiles: Profile[];
  modules: LearningModule[];
  topics: Topic[];
  materials: Material[];
  quizzes: Quiz[];
  attempts: QuizAttempt[];
  progress: LearningProgress[];
  recentLogs: ActivityLog[];
}> {
  try {
    const [
      profilesSnap,
      modulesSnap,
      topicsSnap,
      materialsSnap,
      quizzesSnap,
      attemptsSnap,
      progressSnap,
      logsSnap,
    ] = await Promise.all([
      getDocs(collection(db, 'profiles')),
      getDocs(collection(db, 'modules')),
      getDocs(collection(db, 'topics')),
      getDocs(collection(db, 'materials')),
      getDocs(collection(db, 'quizzes')),
      getDocs(collection(db, 'quiz_attempts')),
      getDocs(collection(db, 'learning_progress')),
      getDocs(collection(db, 'activity_logs')),
    ]);

    return {
      profiles: profilesSnap.docs
        .map((d) => mapDoc<Profile>(d.id, d.data() as Record<string, unknown>))
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
      modules: modulesSnap.docs
        .map((d) => mapDoc<LearningModule>(d.id, d.data() as Record<string, unknown>))
        .sort((a, b) => a.sort_order - b.sort_order),
      topics: topicsSnap.docs
        .map((d) => mapDoc<Topic>(d.id, d.data() as Record<string, unknown>))
        .sort((a, b) => a.sort_order - b.sort_order),
      materials: materialsSnap.docs
        .map((d) => mapDoc<Material>(d.id, d.data() as Record<string, unknown>))
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
      quizzes: quizzesSnap.docs
        .map((d) => mapDoc<Quiz>(d.id, d.data() as Record<string, unknown>))
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
      attempts: attemptsSnap.docs
        .map((d) => mapDoc<QuizAttempt>(d.id, d.data() as Record<string, unknown>))
        .sort((a, b) => b.completed_at.localeCompare(a.completed_at)),
      progress: progressSnap.docs.map((d) =>
        mapDoc<LearningProgress>(d.id, d.data() as Record<string, unknown>)
      ),
      recentLogs: logsSnap.docs
        .map((d) => mapDoc<ActivityLog>(d.id, d.data() as Record<string, unknown>))
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 25),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'admin-overview');
  }
}

export async function adminUpdateUserProfile(
  targetUserId: string,
  updates: {is_active?: boolean; role?: UserRole; full_name?: string; class?: string}
): Promise<Profile> {
  const docPath = `profiles/${targetUserId}`;
  const docRef = doc(db, 'profiles', targetUserId);
  try {
    await updateDoc(docRef, {
      ...updates,
      updated_at: serverTimestamp(),
    });
    const saved = await getDoc(docRef);
    return mapDoc<Profile>(saved.id, saved.data() as Record<string, unknown>);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docPath);
  }
}

export async function seedInitialCurriculum(adminUid: string): Promise<void> {
  const modSolatId = 'mod_solat';
  const modTajwidId = 'mod_tajwid';

  const solatTopics = [
    {
      id: 'top_solat_01',
      title: '1. Pengenalan Solat',
      slug: 'pengenalan-solat',
      description:
        'Memahami konsep asas solat fardu, kedudukan solat sebagai tiang agama dan hikmah pensyariatan solat dalam kehidupan Muslim.',
      objectives: [
        'Menyatakan definisi solat dari sudut bahasa dan syarak',
        'Menghuraikan dalil kewajipan solat lima waktu',
        'Menjelaskan kesan penghayatan solat terhadap akhlak',
      ],
      minutes: 15,
    },
    {
      id: 'top_solat_02',
      title: '2. Syarat Wajib dan Syarat Sah Solat',
      slug: 'syarat-wajib-dan-syarat-sah-solat',
      description:
        'Mengenal pasti syarat yang mewajibkan seseorang mendirikan solat serta syarat yang menentukan kesahan ibadah solat.',
      objectives: [
        'Membezakan syarat wajib dan syarat sah solat',
        'Menyenaraikan 6 syarat sah solat termasuk menutup aurat dan menghadap kiblat',
        'Menjelaskan cara menentukan masuk waktu solat',
      ],
      minutes: 20,
    },
    {
      id: 'top_solat_03',
      title: '3. Rukun Solat',
      slug: 'rukun-solat',
      description:
        "Menguasai 13 rukun solat yang terbahagi kepada rukun qalbi, rukun qauli dan rukun fi'li beserta pengertian tuma'ninah.",
      objectives: [
        'Menyenaraikan 13 rukun solat mengikut tertib',
        "Mengklasifikasikan rukun qalbi, qauli dan fi'li",
        "Menghuraikan maksud tuma'ninah dalam rukuk, iktidal, sujud dan duduk antara dua sujud",
      ],
      minutes: 25,
    },
    {
      id: 'top_solat_04',
      title: '4. Perkara Membatalkan Solat',
      slug: 'perkara-membatalkan-solat',
      description:
        'Mengetahui perkara-perkara yang membatalkan solat agar ibadah terpelihara daripada kecacatan dan kelalaian.',
      objectives: [
        'Mengenal pasti 12 perkara utama yang membatalkan solat',
        'Membezakan pergerakan besar (3 kali berturut-turut) dan pergerakan kecil',
        'Menjelaskan tindakan apabila berhadas ketika sedang bersolat',
      ],
      minutes: 15,
    },
    {
      id: 'top_solat_05',
      title: '5. Wuduk',
      slug: 'wuduk',
      description:
        'Panduan lengkap rukun wuduk, sunat-sunat wuduk, perkara yang membatalkan wuduk serta tatacara berwuduk dengan sempurna.',
      objectives: [
        'Menyatakan 6 rukun wuduk mengikut tertib',
        'Melafazkan niat wuduk dengan tepat',
        'Mengamalkan sunat-sunat wuduk dan doa selepas wuduk',
      ],
      minutes: 20,
    },
    {
      id: 'top_solat_06',
      title: '6. Persediaan Sebelum Solat',
      slug: 'persediaan-sebelum-solat',
      description:
        'Persediaan fizikal, kebersihan tempat, pakaian suci, azan, iqamah dan penghadiran hati (khusyuk) sebelum Takbiratul Ihram.',
      objectives: [
        'Memastikan kesucian diri, pakaian dan tempat solat daripada najis',
        'Menghayati adab menjawab laungan azan dan iqamah',
        'Mengamalkan doa selepas azan sebelum memulakan solat',
      ],
      minutes: 15,
    },
    {
      id: 'top_solat_07',
      title: '7. Tatacara Solat',
      slug: 'tatacara-solat',
      description:
        'Langkah demi langkah pelaksanaan solat bermula daripada berdiri tegak hingga salam beserta posisi anggota badan yang tepat.',
      objectives: [
        'Melaksanakan pergerakan solat mengikut tertib daripada niat hingga salam',
        'Memastikan kedudukan tujuh anggota sujud menyentuh lantai',
        'Membezakan duduk iftirasy dan duduk tawarruk',
      ],
      minutes: 25,
    },
    {
      id: 'top_solat_08',
      title: '8. Bacaan dalam Solat',
      slug: 'bacaan-dalam-solat',
      description:
        'Hafazan dan pemahaman makna bacaan wajib serta sunat dalam solat daripada doa Iftitah sehingga Tahiyat Akhir dan Salam.',
      objectives: [
        'Membaca surah al-Fatihah dengan makhraj dan tajwid yang betul',
        'Menghafaz bacaan rukuk, iktidal, sujud dan duduk antara dua sujud',
        'Menghayati maksud bacaan Tahiyat Akhir dan selawat Ibrahimiyyah',
      ],
      minutes: 30,
    },
    {
      id: 'top_solat_09',
      title: '9. Solat Berjemaah',
      slug: 'solat-berjemaah',
      description:
        'Kelebihan solat berjemaah, syarat menjadi imam, kedudukan makmum serta tatacara makmum muwafiq dan masbuq.',
      objectives: [
        'Menjelaskan kelebihan pahala solat berjemaah 27 kali ganda',
        'Membezakan makmum muwafiq dan makmum masbuq',
        'Menyusun saf dengan betul mengikut garis panduan syarak',
      ],
      minutes: 20,
    },
    {
      id: 'top_solat_10',
      title: '10. Kesilapan Lazim dalam Solat',
      slug: 'kesilapan-lazim-dalam-solat',
      description:
        "Mengenal pasti dan membetulkan kesilapan yang sering berlaku dalam bacaan, pergerakan tuma'ninah dan kekhusyukan solat.",
      objectives: [
        'Mengesan kesilapan lazim ketika Takbiratul Ihram dan sujud',
        'Memperbetul bacaan al-Fatihah dan tahiyat yang kurang tepat',
        'Meninggalkan amalan mendahului imam dalam solat berjemaah',
      ],
      minutes: 20,
    },
  ];

  const tajwidTopics = [
    {
      id: 'top_tajwid_01',
      title: '1. Pengenalan Ilmu Tajwid',
      slug: 'pengenalan-ilmu-tajwid',
      description:
        'Memahami pengertian ilmu tajwid, hukum mempelajarinya serta peringkat bacaan al-Quran (Tahqiq, Tartil, Tadwir, Hadr).',
      objectives: [
        'Mendefinisikan ilmu tajwid dari sudut bahasa dan istilah',
        'Membezakan hukum fardu kifayah (ilmu) dan fardu ain (amali)',
        'Mengenal empat martabat bacaan al-Quran',
      ],
      minutes: 15,
    },
    {
      id: 'top_tajwid_02',
      title: '2. Hukum Nun Sakinah dan Tanwin',
      slug: 'hukum-nun-sakinah-dan-tanwin',
      description:
        "Menguasai empat hukum utama Nun Mati dan Tanwin: Izhar Halqi, Idgham, Iqlab dan Ikhfa' Haqiqi.",
      objectives: [
        'Menyenaraikan huruf bagi setiap hukum Nun Sakinah dan Tanwin',
        "Membezakan Idgham Ma'al Ghunnah dan Idgham Bila Ghunnah",
        "Mengaplikasikan dengung 2 harakat pada Iqlab dan Ikhfa' Haqiqi",
      ],
      minutes: 25,
    },
    {
      id: 'top_tajwid_03',
      title: '3. Hukum Mim Sakinah',
      slug: 'hukum-mim-sakinah',
      description:
        "Mempelajari tiga hukum Mim Mati apabila bertemu huruf hijaiyah iaitu Ikhfa' Syafawi, Idgham Mithlain dan Izhar Syafawi.",
      objectives: [
        "Mengenal pasti huruf bagi Ikhfa' Syafawi (Ba), Idgham Mithlain (Mim) dan Izhar Syafawi",
        'Menghuraikan sebab bacaan Izhar Syafawi lebih jelas pada huruf Waw dan Fa',
        'Membaca contoh ayat al-Quran dengan hukum Mim Sakinah yang tepat',
      ],
      minutes: 20,
    },
    {
      id: 'top_tajwid_04',
      title: '4. Hukum Mad',
      slug: 'hukum-mad',
      description:
        "Memahami pembahagian Mad Asli (Tabi'i) dan Mad Far'i termasuk Mad Wajib Muttasil, Mad Jaiz Munfasil, Mad Aridh Lissukun dan Mad Lazim.",
      objectives: [
        "Membezakan kadar harakat Mad Asli (2 harakat) dan Mad Far'i (4/5/6 harakat)",
        'Mengenal pasti sebab pemanjangan Mad kerana huruf Hamzah atau Sukun',
        'Mengaplikasikan bacaan Mad Lazim Kalimi Muthaqqal dengan tepat',
      ],
      minutes: 30,
    },
    {
      id: 'top_tajwid_05',
      title: '5. Hukum Qalqalah',
      slug: 'hukum-qalqalah',
      description:
        'Mengenali lima huruf Qalqalah (ق ط ب ج د) serta tiga tahap lantunan iaitu Qalqalah Sughra, Kubra dan Akbar.',
      objectives: [
        'Menghafaz lima huruf Qalqalah dalam ungkapan Qutbu Jadin',
        'Membezakan lantunan Qalqalah Sughra di tengah kalimah dan Kubra ketika waqaf',
        'Mengelakkan penambahan bunyi huruf vokal selepas lantunan Qalqalah',
      ],
      minutes: 20,
    },
    {
      id: 'top_tajwid_06',
      title: '6. Hukum Ra',
      slug: 'hukum-ra',
      description:
        'Menguasai keadaan huruf Ra yang dibaca tebal (Tafkhim), nipis (Tarqiq) dan harus kedua-duanya (Jawazul Wajhain).',
      objectives: [
        'Mengenal pasti keadaan huruf Ra dibaca Tafkhim',
        'Menyenaraikan keadaan huruf Ra dibaca Tarqiq',
        'Mengaplikasikan hukum Ra ketika waqaf dengan tepat',
      ],
      minutes: 20,
    },
    {
      id: 'top_tajwid_07',
      title: '7. Makharij al-Huruf',
      slug: 'makharij-al-huruf',
      description:
        'Mengenal lima kawasan utama tempat keluar huruf hijaiyah: Al-Jauf, Al-Halq, Al-Lisan, Asy-Syafatan dan Al-Khaisyum.',
      objectives: [
        'Menyatakan 5 makhraj umum dan 17 makhraj khusus huruf hijaiyah',
        'Menyebut huruf-huruf halkum (Al-Halq) daripada pangkal, tengah dan hujung kerongkong',
        'Membezakan bunyi huruf yang hampir sama makhraj seperti ض dan د',
      ],
      minutes: 25,
    },
    {
      id: 'top_tajwid_08',
      title: '8. Sifat Huruf',
      slug: 'sifat-huruf',
      description:
        "Memahami sifat huruf berlawanan (Hams/Jahr, Syiddah/Rakhawah, Isti'la'/Istifal) dan sifat tunggal seperti Safir, Tafassyi dan Istitalah.",
      objectives: [
        'Membezakan sifat berlawanan dan sifat tidak berlawanan',
        "Mengenal pasti huruf Isti'la' (خ ص ض غ ط ق ظ) yang dibaca tebal",
        'Mempraktikkan sifat Tafassyi pada huruf Syin dan Istitalah pada huruf Dhad',
      ],
      minutes: 25,
    },
    {
      id: 'top_tajwid_09',
      title: "9. Waqaf dan Ibtida'",
      slug: 'waqaf-dan-ibtida',
      description:
        'Memahami tanda-tanda waqaf dalam Mushaf Rasm Uthmani serta cara memberhentikan dan memulakan bacaan tanpa merosakkan makna ayat.',
      objectives: [
        'Mengenal pasti tanda waqaf lazim (مـ), waqaf aula (قلى) dan wasal aula (صلى)',
        'Membezakan Waqaf Tam, Waqaf Kafi, Waqaf Hasan dan Waqaf Qabih',
        "Memilih tempat ibtida' yang memelihara kesempurnaan maksud ayat",
      ],
      minutes: 20,
    },
    {
      id: 'top_tajwid_10',
      title: '10. Latihan Bacaan al-Quran',
      slug: 'latihan-bacaan-al-quran',
      description:
        'Aplikasi bersepadu seluruh hukum tajwid melalui analisis ayat-ayat lazim daripada Surah al-Fatihah dan Juzuk Amma.',
      objectives: [
        'Menganalisis hukum Nun Mati, Mim Mati, Mad dan Qalqalah dalam Surah al-Fatihah',
        'Membaca surah-surah pendek daripada Juzuk Amma secara bertajwid',
        'Menilai ketepatan waqaf dan makhraj secara kendiri',
      ],
      minutes: 30,
    },
  ];

  const seedDocIfMissingOrUpdate = async (
    colName: string,
    id: string,
    payload: Record<string, unknown>
  ) => {
    const ref = doc(db, colName, id);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, {
        ...payload,
        updated_at: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        ...payload,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
    }
  };

  try {
    // Lapisan 1: Modul Utama
    await Promise.all([
      seedDocIfMissingOrUpdate('modules', modSolatId, {
        id: modSolatId,
        code: 'MOD-SOLAT',
        title: 'MODUL 1: PEMBELAJARAN SOLAT',
        slug: 'pembelajaran-solat',
        description:
          "Pembelajaran sistematik mengenai pensyariatan solat, syarat sah dan wajib, rukun fi'li dan qauli, wuduk, bacaan solat serta tatacara solat berjemaah.",
        icon_name: 'compass',
        sort_order: 1,
        status: 'Published',
        created_by: adminUid,
      }),
      seedDocIfMissingOrUpdate('modules', modTajwidId, {
        id: modTajwidId,
        code: 'MOD-TAJWID',
        title: 'MODUL 2: PEMBELAJARAN TAJWID',
        slug: 'pembelajaran-tajwid',
        description:
          "Penguasaan hukum bacaan al-Quran meliputi Nun Sakinah dan Tanwin, Mim Sakinah, hukum Mad, Qalqalah, hukum Ra, Makharij al-Huruf, Sifat Huruf dan Waqaf Ibtida'.",
        icon_name: 'book-open',
        sort_order: 2,
        status: 'Published',
        created_by: adminUid,
      }),
    ]);

    // Lapisan 2: Topik (bergantung pada modules)
    await Promise.all([
      ...solatTopics.map((t, idx) =>
        seedDocIfMissingOrUpdate('topics', t.id, {
          id: t.id,
          module_id: modSolatId,
          title: t.title,
          slug: t.slug,
          description: t.description,
          learning_objectives: t.objectives,
          sort_order: idx + 1,
          estimated_minutes: t.minutes,
          status: 'Published',
        })
      ),
      ...tajwidTopics.map((t, idx) =>
        seedDocIfMissingOrUpdate('topics', t.id, {
          id: t.id,
          module_id: modTajwidId,
          title: t.title,
          slug: t.slug,
          description: t.description,
          learning_objectives: t.objectives,
          sort_order: idx + 1,
          estimated_minutes: t.minutes,
          status: 'Published',
        })
      ),
    ]);

    // Lapisan 3: Subtopik, Blok Kandungan & Kuiz (bergantung pada modules & topics)
    await Promise.all([
      seedDocIfMissingOrUpdate('subtopics', 'sub_solat_rukun_01', {
        id: 'sub_solat_rukun_01',
        topic_id: 'top_solat_03',
        title: 'Pembahagian 13 Rukun Solat',
        summary: "Pengkelasan rukun solat kepada Rukun Qalbi, Rukun Qauli dan Rukun Fi'li.",
        sort_order: 1,
        status: 'Published',
      }),
      seedDocIfMissingOrUpdate('subtopics', 'sub_tajwid_nun_01', {
        id: 'sub_tajwid_nun_01',
        topic_id: 'top_tajwid_02',
        title: 'Izhar Halqi, Idgham, Iqlab & Ikhfa Haqiqi',
        summary: 'Empat hukum utama apabila Nun Mati atau Tanwin bertemu huruf hijaiyah.',
        sort_order: 1,
        status: 'Published',
      }),
      seedDocIfMissingOrUpdate('content_blocks', 'blk_solat_rukun_01', {
        id: 'blk_solat_rukun_01',
        topic_id: 'top_solat_03',
        subtopic_id: 'sub_solat_rukun_01',
        block_type: 'note',
        title: 'Tiga Kategori Rukun Solat',
        body: "Rukun solat bermaksud perkara asas yang wajib dilakukan dalam solat. Jika ditinggalkan dengan sengaja, solat menjadi tidak sah. 13 rukun solat terbahagi kepada:\n1. Rukun Qalbi (Hati): Niat dan Tertib.\n2. Rukun Qauli (Bacaan Lisan): Takbiratul Ihram, Surah al-Fatihah, Tahiyat Akhir, Selawat ke atas Nabi dalam Tahiyat Akhir dan Salam yang pertama.\n3. Rukun Fi'li (Perbuatan): Berdiri betul bagi yang mampu, Rukuk serta tuma'ninah, Iktidal serta tuma'ninah, Sujud dua kali serta tuma'ninah, Duduk antara dua sujud serta tuma'ninah, dan Duduk Tahiyat Akhir.",
        arabic_text: null,
        transliteration: null,
        translation: null,
        sort_order: 1,
        status: 'Published',
      }),
      seedDocIfMissingOrUpdate('content_blocks', 'blk_solat_rukun_02', {
        id: 'blk_solat_rukun_02',
        topic_id: 'top_solat_03',
        subtopic_id: 'sub_solat_rukun_01',
        block_type: 'prayer_recitation',
        title: 'Lafaz Takbiratul Ihram (Rukun Qauli Pertama)',
        body: 'Dilafazkan serentak dengan niat di dalam hati sambil mengangkat kedua-dua tangan paras bahu atau telinga.',
        arabic_text: 'اللَّهُ أَكْبَرُ',
        transliteration: 'Allahu Akbar',
        translation: 'Allah Maha Besar',
        sort_order: 2,
        status: 'Published',
      }),
      seedDocIfMissingOrUpdate('content_blocks', 'blk_tajwid_nun_01', {
        id: 'blk_tajwid_nun_01',
        topic_id: 'top_tajwid_02',
        subtopic_id: 'sub_tajwid_nun_01',
        block_type: 'quran_tajwid',
        title: "Contoh Izhar Halqi dan Ikhfa' Haqiqi",
        body: "1. Izhar Halqi: Nun Mati atau Tanwin bertemu huruf kerongkong (ء هـ ع ح غ خ) — dibaca jelas tanpa dengung.\n2. Ikhfa' Haqiqi: Bertemu 15 huruf ikhfa' — dibaca samar dengan dengung 2 harakat.",
        arabic_text: 'مِنْ خَوْفٍ ۝ عَذَابٌ قَرِيبٌ',
        transliteration: "Min khaufin | 'Adzabun qarib",
        translation: "Daripada ketakutan (Izhar Halqi) | Azab yang dekat (Ikhfa' Haqiqi)",
        sort_order: 1,
        status: 'Published',
      }),
      seedDocIfMissingOrUpdate('quizzes', 'quiz_solat_01', {
        id: 'quiz_solat_01',
        module_id: modSolatId,
        topic_id: 'top_solat_03',
        title: 'Kuiz Teras Pembelajaran Solat',
        description:
          'Menilai kefahaman pelajar tentang syarat sah, pembahagian 13 rukun solat serta bacaan solat.',
        passing_score: 70,
        allow_retake: true,
        max_attempts: null,
        time_limit_minutes: 15,
        status: 'Published',
        created_by: adminUid,
      }),
      seedDocIfMissingOrUpdate('quizzes', 'quiz_tajwid_01', {
        id: 'quiz_tajwid_01',
        module_id: modTajwidId,
        topic_id: 'top_tajwid_02',
        title: 'Kuiz Penguasaan Hukum Tajwid',
        description:
          'Latihan mengenal pasti hukum Nun Sakinah, Mim Sakinah, Qalqalah dan padanan istilah tajwid.',
        passing_score: 70,
        allow_retake: true,
        max_attempts: null,
        time_limit_minutes: 15,
        status: 'Published',
        created_by: adminUid,
      }),
    ]);

    // Lapisan 4: Soalan Kuiz (bergantung pada quizzes)
    await Promise.all([
      seedDocIfMissingOrUpdate('questions', 'q_solat_01', {
        id: 'q_solat_01',
        quiz_id: 'quiz_solat_01',
        quiz_status: 'Published',
        question_type: 'objective',
        prompt:
          'Antara berikut, yang manakah termasuk dalam kategori Rukun Qalbi (hati) dalam solat?',
        arabic_prompt: null,
        explanation:
          "Rukun Qalbi terdiri daripada Niat dan Tertib. Takbiratul Ihram ialah Rukun Qauli, manakala Rukuk ialah Rukun Fi'li.",
        points: 10,
        sort_order: 1,
      }),
      seedDocIfMissingOrUpdate('questions', 'q_solat_02', {
        id: 'q_solat_02',
        quiz_id: 'quiz_solat_01',
        quiz_status: 'Published',
        question_type: 'matching',
        prompt:
          'Padankan jenis rukun solat di sebelah kiri dengan contoh yang tepat di sebelah kanan.',
        arabic_prompt: null,
        explanation:
          "Niat ialah amalan hati (Qalbi), al-Fatihah ialah bacaan lisan (Qauli), dan Sujud ialah perbuatan anggota (Fi'li).",
        points: 15,
        sort_order: 2,
      }),
      seedDocIfMissingOrUpdate('questions', 'q_tajwid_01', {
        id: 'q_tajwid_01',
        quiz_id: 'quiz_tajwid_01',
        quiz_status: 'Published',
        question_type: 'tajwid_identification',
        prompt:
          'Kenal pasti hukum tajwid bagi Nun Sakinah yang bertemu huruf Ba dalam potongan kalimah di bawah:',
        arabic_prompt: 'مِنْ بَعْدِ',
        explanation:
          'Apabila Nun Sakinah (نْ) atau Tanwin bertemu huruf Ba (ب), hukumnya ialah Iqlab iaitu menukarkan bunyi Nun kepada Mim ringan beserta dengung 2 harakat.',
        points: 10,
        sort_order: 1,
      }),
      seedDocIfMissingOrUpdate('questions', 'q_tajwid_02', {
        id: 'q_tajwid_02',
        quiz_id: 'quiz_tajwid_01',
        quiz_status: 'Published',
        question_type: 'matching',
        prompt:
          'Padankan hukum Nun Sakinah dan Tanwin dengan himpunan hurufnya yang tepat.',
        arabic_prompt: null,
        explanation:
          "Izhar Halqi mempunyai 6 huruf kerongkong, Idgham Ma'al Ghunnah 4 huruf (ي ن م و), dan Idgham Bila Ghunnah 2 huruf (ل ر).",
        points: 15,
        sort_order: 2,
      }),
    ]);

    // Lapisan 5: Pilihan Jawapan (bergantung pada questions)
    const optionSeeds = [
      {id: 'opt_s1_1', quiz_id: 'quiz_solat_01', question_id: 'q_solat_01', text: 'Niat dan Tertib', target: null, correct: true, order: 1},
      {id: 'opt_s1_2', quiz_id: 'quiz_solat_01', question_id: 'q_solat_01', text: 'Takbiratul Ihram dan Surah al-Fatihah', target: null, correct: false, order: 2},
      {id: 'opt_s1_3', quiz_id: 'quiz_solat_01', question_id: 'q_solat_01', text: "Rukuk dan Sujud serta tuma'ninah", target: null, correct: false, order: 3},
      {id: 'opt_s1_4', quiz_id: 'quiz_solat_01', question_id: 'q_solat_01', text: 'Duduk Tahiyat Akhir dan Salam', target: null, correct: false, order: 4},
      {id: 'opt_s2_1', quiz_id: 'quiz_solat_01', question_id: 'q_solat_02', text: 'Rukun Qalbi', target: 'Niat di dalam hati ketika Takbiratul Ihram', correct: true, order: 1},
      {id: 'opt_s2_2', quiz_id: 'quiz_solat_01', question_id: 'q_solat_02', text: 'Rukun Qauli', target: 'Membaca Surah al-Fatihah', correct: true, order: 2},
      {id: 'opt_s2_3', quiz_id: 'quiz_solat_01', question_id: 'q_solat_02', text: "Rukun Fi'li", target: "Rukuk dan Sujud beserta tuma'ninah", correct: true, order: 3},
      {id: 'opt_t1_1', quiz_id: 'quiz_tajwid_01', question_id: 'q_tajwid_01', text: 'Iqlab', target: null, correct: true, order: 1},
      {id: 'opt_t1_2', quiz_id: 'quiz_tajwid_01', question_id: 'q_tajwid_01', text: 'Izhar Halqi', target: null, correct: false, order: 2},
      {id: 'opt_t1_3', quiz_id: 'quiz_tajwid_01', question_id: 'q_tajwid_01', text: 'Idgham Bila Ghunnah', target: null, correct: false, order: 3},
      {id: 'opt_t1_4', quiz_id: 'quiz_tajwid_01', question_id: 'q_tajwid_01', text: "Ikhfa' Syafawi", target: null, correct: false, order: 4},
      {id: 'opt_t2_1', quiz_id: 'quiz_tajwid_01', question_id: 'q_tajwid_02', text: 'Izhar Halqi', target: 'ء هـ ع ح غ خ', correct: true, order: 1},
      {id: 'opt_t2_2', quiz_id: 'quiz_tajwid_01', question_id: 'q_tajwid_02', text: "Idgham Ma'al Ghunnah", target: 'ي ن م و', correct: true, order: 2},
      {id: 'opt_t2_3', quiz_id: 'quiz_tajwid_01', question_id: 'q_tajwid_02', text: 'Idgham Bila Ghunnah', target: 'ل ر', correct: true, order: 3},
    ];

    await Promise.all(
      optionSeeds.map((o) =>
        seedDocIfMissingOrUpdate('quiz_options', o.id, {
          id: o.id,
          quiz_id: o.quiz_id,
          question_id: o.question_id,
          quiz_status: 'Published',
          option_text: o.text,
          match_target: o.target,
          is_correct: o.correct,
          sort_order: o.order,
        })
      )
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'seedInitialCurriculum');
  }
}
