"use client";

import { useState, useRef } from "react";
import { ExerciseSet, Exercise } from "@/types/exercise";

type Tab = "exercicio" | "gerar";

type AnswerState = "idle" | "correct" | "incorrect";

interface FillResult {
  state: AnswerState;
  correctAnswers: string[];
  userAnswer: string;
}

// ─── prompts ────────────────────────────────────────────────────────────────

const PROMPT_FILL = `Crie um exercício de francês do tipo "preencher lacunas" sobre o tópico: [TÓPICO].

Devolva APENAS um JSON válido, sem texto extra, sem markdown, sem blocos de código, exatamente neste formato:

{
  "title": "Título do exercício em francês",
  "instruction": "Instrução do exercício em francês",
  "exercises": [
    {
      "id": 1,
      "type": "fill",
      "parts": ["texto antes do blank ", " texto depois do blank."],
      "answers": ["resposta aceita", "outra resposta aceita se houver"]
    }
  ]
}

Regras:
- Gere entre 6 e 10 exercícios
- "parts" sempre tem exatamente 2 strings: o que vem ANTES e o que vem DEPOIS do espaço em branco
- "answers" lista todas as respostas corretas possíveis
- As respostas devem ter acentos corretos em francês
- O JSON deve ser válido e completo`;

const PROMPT_OPEN = `Crie um exercício de francês do tipo "produção livre" sobre o tópico: [TÓPICO].

Devolva APENAS um JSON válido, sem texto extra, sem markdown, sem blocos de código, exatamente neste formato:

{
  "title": "Título do exercício em francês",
  "instruction": "Instrução completa do exercício em francês",
  "wordbank": ["palavra1", "palavra2", "palavra3"],
  "exercises": [
    {
      "id": 1,
      "type": "open",
      "prompt": "O enunciado do item, ex: Un bon chirurgien :",
      "suggested": "Resposta sugerida completa, ex: Il est calme et précis."
    }
  ]
}

Regras:
- Gere entre 4 e 6 exercícios
- "wordbank" é a lista de palavras/opções que o aluno pode usar (opcional mas recomendado)
- "prompt" é o enunciado de cada item
- "suggested" é UMA resposta de exemplo — o aluno não será julgado, só verá esta sugestão
- O primeiro item pode servir de exemplo já preenchido (suggested visível de cara)
- O JSON deve ser válido e completo`;

// ─── component ──────────────────────────────────────────────────────────────

export default function Home() {
  const [tab, setTab] = useState<Tab>("exercicio");
  const [exerciseSet, setExerciseSet] = useState<ExerciseSet | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [fillResults, setFillResults] = useState<Record<number, FillResult> | null>(null);
  const [revealedOpen, setRevealedOpen] = useState<Record<number, boolean>>({});
  const [showAllSuggested, setShowAllSuggested] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedFill, setCopiedFill] = useState(false);
  const [copiedOpen, setCopiedOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── file upload ──
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string) as ExerciseSet;
        if (!data.exercises || !Array.isArray(data.exercises)) throw new Error("Formato inválido");
        setExerciseSet(data);
        setUserAnswers({});
        setFillResults(null);
        setRevealedOpen({});
        setShowAllSuggested(false);
        setError(null);
      } catch {
        setError("JSON inválido ou formato incorreto.");
      }
    };
    reader.readAsText(file);
  }

  function reset() {
    setExerciseSet(null);
    setUserAnswers({});
    setFillResults(null);
    setRevealedOpen({});
    setShowAllSuggested(false);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  // ── fill exercises ──
  function handleInput(id: number, value: string) {
    setUserAnswers((prev) => ({ ...prev, [id]: value }));
    if (fillResults) setFillResults(null);
  }

  function checkAnswers() {
    if (!exerciseSet) return;
    const newResults: Record<number, FillResult> = {};
    for (const ex of exerciseSet.exercises) {
      if ((ex.type ?? "fill") !== "fill") continue;
      const userRaw = (userAnswers[ex.id] ?? "").trim();
      const userNorm = userRaw.toLowerCase();
      const accepted = ex.answers ?? [];
      const isCorrect = accepted.some((a) => a.trim().toLowerCase() === userNorm);
      newResults[ex.id] = {
        state: userRaw === "" ? "idle" : isCorrect ? "correct" : "incorrect",
        correctAnswers: accepted,
        userAnswer: userRaw,
      };
    }
    setFillResults(newResults);
  }

  // ── open exercises ──
  function toggleReveal(id: number) {
    setRevealedOpen((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  // ── copy prompt ──
  function copyPrompt(type: "fill" | "open") {
    const text = type === "fill" ? PROMPT_FILL : PROMPT_OPEN;
    navigator.clipboard.writeText(text).then(() => {
      if (type === "fill") { setCopiedFill(true); setTimeout(() => setCopiedFill(false), 2000); }
      else { setCopiedOpen(true); setTimeout(() => setCopiedOpen(false), 2000); }
    });
  }

  // ── derived ──
  const fillExercises = exerciseSet?.exercises.filter((e) => (e.type ?? "fill") === "fill") ?? [];
  const openExercises = exerciseSet?.exercises.filter((e) => e.type === "open") ?? [];
  const score = fillResults
    ? Object.values(fillResults).filter((r) => r.state === "correct").length
    : null;

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Fill the Blanks — Francês</h1>
        <p className="text-sm text-gray-400 mb-6">Ferramenta de estudo pessoal</p>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-200">
          {(["exercicio", "gerar"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
                tab === t
                  ? "bg-white border border-b-white border-gray-200 text-blue-700 -mb-px"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t === "exercicio" ? "📝 Praticar" : "✨ Gerar JSON"}
            </button>
          ))}
        </div>

        {/* ═══ TAB: EXERCICIO ═══ */}
        {tab === "exercicio" && (
          <>
            {/* Upload */}
            <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Carregar exercícios (.json)
              </label>
              <div className="flex gap-3 items-center flex-wrap">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFile}
                  className="block text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
                {exerciseSet && (
                  <button onClick={reset} className="text-sm text-gray-400 hover:text-gray-600 underline">
                    limpar
                  </button>
                )}
              </div>
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            </div>

            {exerciseSet && (
              <>
                {/* Title + instruction */}
                <h2 className="text-lg font-semibold text-gray-700 mb-1">{exerciseSet.title}</h2>
                {exerciseSet.instruction && (
                  <p className="text-sm text-gray-500 mb-2 italic">{exerciseSet.instruction}</p>
                )}
                {exerciseSet.wordbank && exerciseSet.wordbank.length > 0 && (
                  <p className="text-sm text-gray-500 mb-4">
                    🗂 {exerciseSet.wordbank.join(" – ")}
                  </p>
                )}

                {/* FILL exercises */}
                {fillExercises.length > 0 && (
                  <>
                    <div className="space-y-3 mb-4">
                      {fillExercises.map((ex) => (
                        <FillRow
                          key={ex.id}
                          exercise={ex}
                          value={userAnswers[ex.id] ?? ""}
                          onChange={(v) => handleInput(ex.id, v)}
                          result={fillResults?.[ex.id] ?? null}
                          disabled={!!fillResults}
                        />
                      ))}
                    </div>

                    {fillResults && score !== null && (
                      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 text-center">
                        <p className="text-gray-700 font-medium">
                          Resultado:{" "}
                          <span className="text-blue-700 font-bold">
                            {score} / {fillExercises.length}
                          </span>
                        </p>
                      </div>
                    )}

                    <div className="flex gap-3 mb-8">
                      {!fillResults ? (
                        <button
                          onClick={checkAnswers}
                          className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                        >
                          Verificar respostas
                        </button>
                      ) : (
                        <button
                          onClick={() => { setUserAnswers({}); setFillResults(null); }}
                          className="bg-gray-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-700 transition-colors"
                        >
                          Tentar novamente
                        </button>
                      )}
                    </div>
                  </>
                )}

                {/* OPEN exercises */}
                {openExercises.length > 0 && (
                  <>
                    {fillExercises.length > 0 && (
                      <hr className="border-gray-200 mb-6" />
                    )}
                    <div className="space-y-3 mb-4">
                      {openExercises.map((ex, i) => (
                        <OpenRow
                          key={ex.id}
                          exercise={ex}
                          index={i}
                          value={userAnswers[`open_${ex.id}`] ?? ""}
                          onChange={(v) =>
                            setUserAnswers((prev) => ({ ...prev, [`open_${ex.id}`]: v }))
                          }
                          revealed={showAllSuggested || !!revealedOpen[ex.id]}
                          onToggleReveal={() => toggleReveal(ex.id)}
                        />
                      ))}
                    </div>
                    <button
                      onClick={() => setShowAllSuggested((v) => !v)}
                      className="text-sm text-gray-500 hover:text-gray-700 underline"
                    >
                      {showAllSuggested ? "Esconder todas as sugestões" : "Ver todas as sugestões"}
                    </button>
                  </>
                )}
              </>
            )}

            {/* JSON hint when no file loaded */}
            {!exerciseSet && (
              <details className="mt-2 text-sm text-gray-500">
                <summary className="cursor-pointer hover:text-gray-700 font-medium">
                  Ver formato esperado do JSON
                </summary>
                <pre className="mt-3 bg-gray-100 rounded p-4 text-xs overflow-x-auto whitespace-pre-wrap">
{`{
  "title": "Título do exercício",
  "instruction": "Instrução opcional",
  "wordbank": ["palavra1", "palavra2"],
  "exercises": [
    {
      "id": 1,
      "type": "fill",
      "parts": ["", " japonais."],
      "answers": ["Il est"]
    },
    {
      "id": 2,
      "type": "open",
      "prompt": "Une bonne journaliste :",
      "suggested": "Elle est curieuse et rapide."
    }
  ]
}`}
                </pre>
              </details>
            )}
          </>
        )}

        {/* ═══ TAB: GERAR ═══ */}
        {tab === "gerar" && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
              <p className="font-medium mb-1">Como usar</p>
              <ol className="list-decimal list-inside space-y-1 text-blue-700">
                <li>Escolha o tipo de exercício abaixo</li>
                <li>Copie o prompt e cole em qualquer IA (ChatGPT, Claude, Gemini…)</li>
                <li>Substitua <code className="bg-blue-100 px-1 rounded">[TÓPICO]</code> pelo tema que quiser</li>
                <li>Cole a resposta da IA em um arquivo <code className="bg-blue-100 px-1 rounded">.json</code></li>
                <li>Volte para a aba Praticar e carregue o arquivo</li>
              </ol>
            </div>

            {/* Prompt: fill */}
            <PromptCard
              label="Exercício de preencher lacunas"
              emoji="✏️"
              description='Gera lacunas para completar com palavras/expressões. Ex: "Il ___ japonais."'
              prompt={PROMPT_FILL}
              copied={copiedFill}
              onCopy={() => copyPrompt("fill")}
            />

            {/* Prompt: open */}
            <PromptCard
              label="Exercício de produção livre"
              emoji="💬"
              description="Gera enunciados para o aluno escrever livremente. A resposta sugerida aparece ao pedir."
              prompt={PROMPT_OPEN}
              copied={copiedOpen}
              onCopy={() => copyPrompt("open")}
            />
          </div>
        )}
      </div>
    </main>
  );
}

// ─── FillRow ────────────────────────────────────────────────────────────────

function FillRow({
  exercise,
  value,
  onChange,
  result,
  disabled,
}: {
  exercise: Exercise;
  value: string;
  onChange: (v: string) => void;
  result: FillResult | null;
  disabled: boolean;
}) {
  const parts = exercise.parts ?? ["", ""];
  const borderColor =
    !result || result.state === "idle"
      ? "border-gray-300 focus:border-blue-400"
      : result.state === "correct"
      ? "border-green-500"
      : "border-red-500";

  const bg =
    !result || result.state === "idle"
      ? "bg-white border-gray-200"
      : result.state === "correct"
      ? "bg-green-50 border-green-200"
      : "bg-red-50 border-red-200";

  return (
    <div className={`rounded-lg border p-4 ${bg}`}>
      <div className="flex flex-wrap items-baseline gap-1 text-gray-800">
        <span className="text-gray-400 text-sm font-mono mr-1">{exercise.id}.</span>
        <span>{parts[0]}</span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="___________"
          className={`border-b-2 ${borderColor} bg-transparent outline-none px-1 py-0.5 min-w-[120px] text-gray-800 placeholder-gray-300 disabled:cursor-default`}
        />
        {parts[1] && <span>{parts[1]}</span>}
      </div>

      {result?.state === "incorrect" && (
        <p className="mt-2 text-sm text-red-700">
          ✗ Você respondeu: <span className="font-medium">"{result.userAnswer || "(em branco)"}"</span>
          {" — "}
          Resposta{result.correctAnswers.length > 1 ? "s" : ""} correta{result.correctAnswers.length > 1 ? "s" : ""}:{" "}
          <span className="font-semibold">{result.correctAnswers.join(" / ")}</span>
        </p>
      )}
      {result?.state === "correct" && (
        <p className="mt-1 text-sm text-green-700">✓ Correto!</p>
      )}
    </div>
  );
}

// ─── OpenRow ────────────────────────────────────────────────────────────────

function OpenRow({
  exercise,
  index,
  value,
  onChange,
  revealed,
  onToggleReveal,
}: {
  exercise: Exercise;
  index: number;
  value: string;
  onChange: (v: string) => void;
  revealed: boolean;
  onToggleReveal: () => void;
}) {
  const isExample = index === 0;

  return (
    <div className={`rounded-lg border p-4 ${isExample ? "bg-amber-50 border-amber-200" : "bg-white border-gray-200"}`}>
      <div className="flex items-start gap-2">
        <span className="text-gray-400 text-sm font-mono mt-0.5 shrink-0">{exercise.id}.</span>
        <div className="flex-1">
          <p className="text-gray-700 font-medium mb-2">{exercise.prompt}</p>
          {isExample ? (
            <p className="text-gray-500 italic text-sm">{exercise.suggested}</p>
          ) : (
            <>
              <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Escreva sua resposta..."
                rows={2}
                className="w-full border border-gray-200 rounded p-2 text-sm text-gray-800 outline-none focus:border-blue-400 resize-none bg-gray-50"
              />
              <div className="mt-1">
                <button
                  onClick={onToggleReveal}
                  className="text-xs text-gray-400 hover:text-gray-600 underline"
                >
                  {revealed ? "Esconder sugestão" : "Ver sugestão"}
                </button>
                {revealed && exercise.suggested && (
                  <p className="mt-1 text-sm text-gray-500 italic bg-gray-50 rounded px-2 py-1 border border-gray-100">
                    💡 {exercise.suggested}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── PromptCard ─────────────────────────────────────────────────────────────

function PromptCard({
  label,
  emoji,
  description,
  prompt,
  copied,
  onCopy,
}: {
  label: string;
  emoji: string;
  description: string;
  prompt: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <p className="font-medium text-gray-800">{emoji} {label}</p>
          <p className="text-sm text-gray-500 mt-0.5">{description}</p>
        </div>
        <button
          onClick={onCopy}
          className={`shrink-0 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            copied
              ? "bg-green-100 text-green-700 border border-green-200"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
          }`}
        >
          {copied ? "✓ Copiado!" : "Copiar prompt"}
        </button>
      </div>
      <pre className="mt-3 bg-gray-50 border border-gray-100 rounded p-3 text-xs text-gray-600 overflow-x-auto whitespace-pre-wrap leading-relaxed">
        {prompt}
      </pre>
    </div>
  );
}
