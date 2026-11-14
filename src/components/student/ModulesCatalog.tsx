import {useMemo, useState} from 'react';
import {ArrowRight, BookOpen, CheckCircle2, Clock, Compass, Search} from 'lucide-react';
import {PORTAL_MEDIA} from '../../assets/media';
import type {LearningModule, LearningProgress, Topic} from '../../types/database';

interface ModulesCatalogProps {
  modules: LearningModule[];
  topics: Topic[];
  progressMap: Record<string, LearningProgress>;
  onSelectTopic: (moduleId: string, topicId: string) => void;
}

export function ModulesCatalog({
  modules,
  topics,
  progressMap,
  onSelectTopic,
}: ModulesCatalogProps) {
  const [search, setSearch] = useState('');
  const [selectedModuleId, setSelectedModuleId] = useState<string>('all');

  const filteredTopicsByModule = useMemo(() => {
    const q = search.trim().toLowerCase();
    return modules
      .filter((m) => selectedModuleId === 'all' || m.id === selectedModuleId)
      .map((mod) => {
        const modTopics = topics.filter((t) => t.module_id === mod.id);
        const matchingTopics = q
          ? modTopics.filter(
              (t) =>
                t.title.toLowerCase().includes(q) ||
                t.description.toLowerCase().includes(q)
            )
          : modTopics;
        const completedCount = modTopics.filter(
          (t) => progressMap[t.id]?.is_completed
        ).length;
        const pct =
          modTopics.length > 0
            ? Math.round((completedCount / modTopics.length) * 100)
            : 0;
        return {
          module: mod,
          allTopics: modTopics,
          topics: matchingTopics,
          completedCount,
          percent: pct,
        };
      });
  }, [modules, topics, progressMap, search, selectedModuleId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Modul Pembelajaran</h1>
          <p className="mt-1 text-sm text-slate-600">
            Pilih modul dan topik untuk membaca nota, menonton video, mendengar audio
            dan menjawab kuiz kendiri.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari topik Solat atau Tajwid..."
              className="w-64 rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-emerald-600 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-slate-200/70 p-1">
            <button
              type="button"
              onClick={() => setSelectedModuleId('all')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                selectedModuleId === 'all'
                  ? 'bg-white text-emerald-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua
            </button>
            {modules.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedModuleId(m.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                  selectedModuleId === m.id
                    ? 'bg-white text-emerald-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {m.code === 'MOD-SOLAT' ? 'Solat' : m.code === 'MOD-TAJWID' ? 'Tajwid' : m.title}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filteredTopicsByModule.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-600">
          Belum ada modul diterbitkan oleh Admin.
        </div>
      ) : (
        <div className="space-y-8">
          {filteredTopicsByModule.map(({module: mod, allTopics, topics: modTopics, completedCount, percent}) => {
            const isSolat = mod.code === 'MOD-SOLAT' || mod.slug.includes('solat');
            const coverImg = isSolat ? PORTAL_MEDIA.moduleSolat : PORTAL_MEDIA.moduleTajwid;

            return (
              <section
                key={mod.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
              >
                <div className="grid lg:grid-cols-12 items-stretch border-b border-slate-200">
                  <div className="lg:col-span-4 relative min-h-48 bg-slate-100">
                    <img
                      src={coverImg}
                      alt={mod.title}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="lg:col-span-8 flex flex-col justify-between p-6">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800">
                        {isSolat ? (
                          <Compass className="h-4 w-4" />
                        ) : (
                          <BookOpen className="h-4 w-4" />
                        )}
                        <span>{mod.code}</span>
                        <span aria-hidden="true">·</span>
                        <span>{allTopics.length} Topik Diterbitkan</span>
                      </div>
                      <h2 className="mt-2 text-xl font-bold text-slate-900">
                        {mod.title}
                      </h2>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">
                        {mod.description}
                      </p>
                    </div>

                    <div className="mt-5">
                      <div className="flex items-center justify-between text-xs font-medium text-slate-600 tabular-nums">
                        <span>
                          Kemajuan Anda: {completedCount} / {allTopics.length} topik selesai
                        </span>
                        <span className="font-semibold text-emerald-800">{percent}%</span>
                      </div>
                      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-emerald-700 transition-all"
                          style={{width: `${percent}%`}}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  {modTopics.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      Tiada topik yang sepadan dengan carian anda.
                    </p>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      {modTopics.map((topic) => {
                        const done = Boolean(progressMap[topic.id]?.is_completed);
                        return (
                          <button
                            key={topic.id}
                            type="button"
                            onClick={() => onSelectTopic(mod.id, topic.id)}
                            className="group flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-left transition-colors hover:border-emerald-600 hover:bg-emerald-50/40"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                <span className="inline-flex items-center gap-1 tabular-nums">
                                  <Clock className="h-3.5 w-3.5" /> {topic.estimated_minutes} min
                                </span>
                                <span aria-hidden="true">·</span>
                                <span className={done ? 'font-semibold text-emerald-700' : ''}>
                                  {done ? 'Selesai' : 'Belum Selesai'}
                                </span>
                              </div>
                              <h3 className="mt-1 text-sm font-semibold text-slate-900 group-hover:text-emerald-900">
                                {topic.title}
                              </h3>
                              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-600">
                                {topic.description}
                              </p>
                            </div>
                            {done ? (
                              <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-emerald-700" />
                            ) : (
                              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 group-hover:text-emerald-700" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
