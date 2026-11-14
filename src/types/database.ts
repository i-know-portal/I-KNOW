export type UserRole = 'ADMIN' | 'PELAJAR';
export type PublishStatus = 'Draft' | 'Published';
export type MaterialType = 'pdf' | 'image' | 'audio' | 'video' | 'youtube';
export type ContentBlockType =
  | 'note'
  | 'objective'
  | 'activity'
  | 'prayer_recitation'
  | 'quran_tajwid';
export type QuestionType = 'objective' | 'matching' | 'tajwid_identification';

export interface Profile {
  id: string;
  full_name: string;
  class: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  email?: string;
  institution?: string;
  avatar_url?: string | null;
}

export interface LearningModule {
  id: string;
  code: string;
  title: string;
  slug: string;
  description: string;
  icon_name: string;
  sort_order: number;
  status: PublishStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Topic {
  id: string;
  module_id: string;
  title: string;
  slug: string;
  description: string;
  learning_objectives: string[];
  sort_order: number;
  estimated_minutes: number;
  status: PublishStatus;
  created_at: string;
  updated_at: string;
}

export interface Subtopic {
  id: string;
  topic_id: string;
  title: string;
  summary: string;
  sort_order: number;
  status: PublishStatus;
  created_at: string;
  updated_at: string;
}

export interface ContentBlock {
  id: string;
  topic_id: string;
  subtopic_id: string | null;
  block_type: ContentBlockType;
  title: string;
  body: string;
  arabic_text: string | null;
  transliteration: string | null;
  translation: string | null;
  sort_order: number;
  status: PublishStatus;
  created_at: string;
  updated_at: string;
}

export interface Material {
  id: string;
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
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Quiz {
  id: string;
  module_id: string;
  topic_id: string | null;
  title: string;
  description: string;
  passing_score: number;
  allow_retake: boolean;
  max_attempts: number | null;
  time_limit_minutes: number | null;
  status: PublishStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuizOption {
  id: string;
  quiz_id?: string;
  question_id: string;
  quiz_status?: PublishStatus;
  option_text: string;
  match_target: string | null;
  is_correct: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  quiz_status?: PublishStatus;
  question_type: QuestionType;
  prompt: string;
  arabic_prompt: string | null;
  explanation: string;
  points: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
  quiz_options?: QuizOption[];
}

export interface QuizWithQuestions extends Quiz {
  questions: QuizQuestion[];
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  student_id: string;
  score: number;
  total_points: number;
  earned_points: number;
  passed: boolean;
  started_at: string;
  completed_at: string;
  created_at: string;
  updated_at: string;
}

export interface QuizAnswer {
  id: string;
  attempt_id: string;
  question_id: string;
  selected_option_id: string | null;
  submitted_answer: Record<string, unknown>;
  is_correct: boolean;
  points_earned: number;
  created_at: string;
  updated_at: string;
}

export interface LearningProgress {
  id: string;
  student_id: string;
  module_id: string;
  topic_id: string;
  subtopic_id: string | null;
  is_completed: boolean;
  completion_percent: number;
  last_accessed_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  module_id: string | null;
  topic_id: string | null;
  quiz_id: string | null;
  action_type: string;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}
