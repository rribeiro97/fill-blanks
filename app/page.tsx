"use client";

import { useState, useRef } from "react";
import { ExerciseSet, Exercise } from "@/types/exercise";

type AnswerState = "idle" | "correct" | "incorrect";

interface Result {
  state: AnswerState;
  correctAnswers: string[];
  userAnswer: string;
}

export default function Home() {
  const [exerciseSet, setExerciseSet] = useState<ExerciseSet | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [results, setResults] = useState<Record<number, Result> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
        setResults(null);
        setError(null);
      } catch {
        setError("JSON inválido ou formato incorreto.");
      }
    };
    reader.readAsText(file);
  }

  function handleInput(id: number, value: string) {
    setUserAnswers((prev) => ({ ...prev, [id]: value }));
    if (results) setResults(null);
  }

  function checkAnswers() {
    if (!exerciseSet) return;
    const newResults: Record<number, Result> = {};
    for (const ex of exerciseSet.exercises) {
      const userRaw = (userAnswers[ex.id] ?? "").trim();
      const userNorm = userRaw.toLowerCase();
      const isCorrect = ex.answers.some((a) => a.trim().toLowerCase() === userNorm);
      newResults[ex.id] = {
        state: userRaw === "" ? "idle" : isCorrect ? "correct" : "incorrect",
        correctAnswers: ex.answers,
        userAnswer: userRaw,
      };
    }
    setResults(newResults);
  }

  function reset() {
    setExerciseSet(null);
    setUserAnswers({});
    setResults(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  const score =
    results
      ? Object.values(results).filter((r) => r.state === "correct").length
      : null;

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          Fill the Blanks — Francês
        </h1>

        {/* Upload */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Carregar exercícios (.json)
          </label>
          <div className="flex gap-3 items-center">
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFile}
              className="block text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
            />
            {exerciseSet && (
              <button
                onClick={reset}
                className="text-sm text-gray-400 hover:text-gray-600 underline"
              >
                limpar
              </button>
            )}
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>

        {/* Exercises */}
        {exerciseSet && (
          <>
            <h2 className="text-lg font-semibold text-gray-700 mb-4">
              {exerciseSet.title}
            </h2>

            <div className="space-y-3 mb-6">
              {exerciseSet.exercises.map((ex) => {
                const result = results?.[ex.id];
                return (
                  <ExerciseRow
                    key={ex.id}
                    exercise={ex}
                    value={userAnswers[ex.id] ?? ""}
                    onChange={(v) => handleInput(ex.id, v)}
                    result={result ?? null}
                    disabled={!!results}
                  />
                );
              })}
            </div>

            {/* Score */}
            {results && score !== null && (
              <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 text-center">
                <p className="text-gray-700 font-medium">
                  Resultado:{" "}
                  <span className="text-blue-700 font-bold">
                    {score} / {exerciseSet.exercises.length}
                  </span>
                </p>
              </div>
            )}

            <div className="flex gap-3">
              {!results ? (
                <button
                  onClick={checkAnswers}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Verificar respostas
                </button>
              ) : (
                <button
                  onClick={() => {
                    setUserAnswers({});
                    setResults(null);
                  }}
                  className="bg-gray-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-700 transition-colors"
                >
                  Tentar novamente
                </button>
              )}
            </div>
          </>
        )}

        {/* JSON format hint */}
        {!exerciseSet && (
          <details className="mt-6 text-sm text-gray-500">
            <summary className="cursor-pointer hover:text-gray-700 font-medium">
              Ver formato esperado do JSON
            </summary>
            <pre className="mt-3 bg-gray-100 rounded p-4 text-xs overflow-x-auto">
{`{
  "title": "Complétez avec «Il est» ou «Elle est»",
  "exercises": [
    {
      "id": 1,
      "parts": ["", " japonais."],
      "answers": ["Il est"]
    },
    {
      "id": 2,
      "parts": ["", " jeune."],
      "answers": ["Il est", "Elle est"]
    },
    {
      "id": 3,
      "parts": ["C'est ", " et elle est grande."],
      "answers": ["Marie"]
    }
  ]
}`}
            </pre>
            <p className="mt-2 text-xs text-gray-400">
              <code>parts</code>: fragmentos de texto ao redor do blank (sempre 2 itens por blank).<br />
              <code>answers</code>: respostas aceitas — case-insensitive, acentos obrigatórios.
            </p>
          </details>
        )}
      </div>
    </main>
  );
}

function ExerciseRow({
  exercise,
  value,
  onChange,
  result,
  disabled,
}: {
  exercise: Exercise;
  value: string;
  onChange: (v: string) => void;
  result: Result | null;
  disabled: boolean;
}) {
  const borderColor =
    !result || result.state === "idle"
      ? "border-gray-300 focus:border-blue-400"
      : result.state === "correct"
      ? "border-green-500"
      : "border-red-500";

  const bgColor =
    !result || result.state === "idle"
      ? "bg-white"
      : result.state === "correct"
      ? "bg-green-50"
      : "bg-red-50";

  return (
    <div className={`rounded-lg border p-4 ${bgColor} ${!result || result.state === "idle" ? "border-gray-200" : result.state === "correct" ? "border-green-200" : "border-red-200"}`}>
      <div className="flex flex-wrap items-baseline gap-1 text-gray-800">
        <span className="text-gray-400 text-sm font-mono mr-1">{exercise.id}.</span>
        <span>{exercise.parts[0]}</span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="___________"
          className={`border-b-2 ${borderColor} bg-transparent outline-none px-1 py-0.5 min-w-[120px] text-gray-800 placeholder-gray-300 disabled:cursor-default`}
        />
        {exercise.parts[1] && <span>{exercise.parts[1]}</span>}
      </div>

      {result && result.state === "incorrect" && (
        <p className="mt-2 text-sm text-red-700">
          ✗ Você respondeu: <span className="font-medium">"{result.userAnswer || "(em branco)"}"</span>
          {" — "}
          Resposta{result.correctAnswers.length > 1 ? "s" : ""} correta{result.correctAnswers.length > 1 ? "s" : ""}:{" "}
          <span className="font-semibold">{result.correctAnswers.join(" / ")}</span>
        </p>
      )}
      {result && result.state === "correct" && (
        <p className="mt-1 text-sm text-green-700">✓ Correto!</p>
      )}
    </div>
  );
}
