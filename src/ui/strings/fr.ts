// French static chrome (08 §2, ticket 24). Hand-translated once, checked in, never generated at
// runtime. Keys mirror en.ts exactly — the `satisfies` clause in index.ts and the key-parity test
// both fail if a key here drifts from English.
// Glossary Ruling: "beat" (CONTEXT.md) renders as "étape" in French copy — a natural, ordinary
// word for one step of the exam, not a calque of "beat". Every other CONTEXT.md term (mutant,
// viva, taxonomy label, confidently wrong, …) keeps its English spelling as a domain term.
import type { en } from "./en";

export const fr: Record<keyof typeof en, string> = {
  "app.title": "Viva",
  "app.tagline": "Un examen oral généré à partir de votre propre code JavaScript.",

  "mode.fallback.label": "Mode de repli",
  "mode.fallback.detail":
    "Aucun modèle n'a été utilisé : entrées limites par défaut, premier mutant qui change la sortie, formulations toutes faites.",
  "mode.live.label": "En direct",
  "mode.live.detail": "Un modèle a choisi les mutants à interroger.",
  "mode.live.detailWithProvider": "{provider} ({model}) a choisi les mutants à interroger.",
  "mode.fallback.reason": "Pourquoi : {reason}",
  "mode.fallback.detailAfterModel":
    "{provider} ({model}) a évalué les candidats, mais ceci utilise le mode de repli : entrées limites par défaut, premier mutant qui change la sortie, formulations toutes faites.",
  "mode.pending.label": "Mode décidé au démarrage",
  "mode.pending.detail": "En direct, en cache ou de repli : le mode est décidé au lancement du viva ; ce bandeau indiquera lequel.",
  "mode.cached.label": "En cache",
  "mode.cached.detail": "Relecture d'une réponse de modèle déjà enregistrée pour ce code.",
  "mode.cached.detailWithProvider": "Relecture d'une réponse enregistrée de {provider} ({model}) pour ce code.",

  "start.heading": "Choisissez le code sur lequel être interrogé",
  "start.forceFallback": "Forcer le mode de repli (interrupteur de démo)",
  "start.clearCache": "Effacer les réponses de filtrage en cache",
  "start.clearCacheDone": "Effacé — le prochain viva appellera de nouveau un fournisseur.",
  "start.source.demo": "Fonctions de démonstration",
  "start.source.demoNote": "Fonctions d'exemple fournies avec Viva, pas celles de votre propre dépôt.",
  "start.begin": "Démarrer le viva",
  "start.loading": "Exécution de votre code et de ses mutants…",
  "start.noDocstring": "aucune docstring fournie",
  "start.rejected.heading": "Exclu de ce corpus",
  "start.rejected.reason": "Exclu : {reason}",

  "selection.language.heading": "Langue",
  "selection.heading": "Choisissez vos fonctions",
  "selection.n.label": "Fonctions incluses : {n} sur {total}",
  "selection.complexity": "Score de complexité : {score}",
  "selection.cutoff": "↑ inclus dans ce viva (top {n}) — non inclus ci-dessous ↓",
  "selection.cutoffAll": "↑ toutes les fonctions éligibles sont incluses ↓",
  "selection.help.heading": "Combien de temps cela va-t-il prendre ?",
  "selection.help.body":
    "Deux réglages déterminent la durée du viva : combien de fonctions vous incluez (N), et combien de mutants et d'étapes chaque fonction apporte (environ {mutantsPerFunction} mutants par fonction, {beatsPerMutant} étapes par mutant). Pour N={n}, comptez environ {estimate} étapes.",
  "selection.help.provisional": "Les chiffres de mutants par fonction et d'étapes par mutant sont provisoires, pas définitifs.",
  "selection.begin": "Démarrer le viva avec ces {n} fonctions",

  "beat.question": "{call} → ?",
  "beat.question.returnsFunction": "{call} retourne une fonction ; l'appeler {count} fois donne ?",
  "beat.prediction.label": "Votre prédiction",
  "beat.prediction.hint": "Une valeur JavaScript : 42, \"texte\", true, null. Pour une erreur : throws TypeError.",
  "beat.confidence.label": "Confiance d'avoir raison (%)",
  "beat.confidence.hint": "De 0 à 100, à une décimale près.",
  "beat.submit": "Révéler",

  "confidence.decrement": "Diminuer la confiance de 0,1 %",
  "confidence.increment": "Augmenter la confiance de 0,1 %",
  "confidence.legend.guessing": "Au hasard",
  "confidence.legend.leaning": "Une tendance",
  "confidence.legend.indifferent": "Aucune conviction dans un sens ou l'autre",
  "confidence.legend.fairlySure": "Plutôt sûr",
  "confidence.legend.certain": "Certain",

  "reveal.right": "Correct.",
  "reveal.wrong": "Incorrect.",
  "reveal.predicted": "Vous avez prédit",
  "reveal.readAs": "Lu comme",
  "reveal.mutantOutput": "Cette version retourne",
  "reveal.originalOutput": "Votre original retourne",
  "reveal.confidence": "Votre confiance",
  "reveal.confidenceValue": "{confidence} %",
  "reveal.next": "Suivant",
  "reveal.toReport": "Voir le rapport",

  "report.heading": "Rapport",
  "report.bucket.confidently-right": "Sûr et juste",
  "report.bucket.confidently-wrong": "Sûr et faux",
  "report.bucket.uncertain-right": "Incertain et juste",
  "report.bucket.uncertain-wrong": "Incertain et faux",
  "report.change": "Changement : {from} → {to} ({rule})",
  "report.unlabelled": "Sans étiquette",
  "report.fact": "{call} : réponse {answered}, la bonne réponse était {correctAnswer}, confiance de {confidence} %.",
  "report.restart": "Recommencer",
  "report.fallbackNote": "Ce viva a tourné en mode de repli : aucun modèle n'a été utilisé, donc rien ici ne porte d'étiquette de taxonomie.",
  "report.summary.brier": "Score de Brier moyen : {brier}",
  "report.summary.pointer": "Commencez par sûr et faux, ci-dessous — c'est là où vous étiez sûr de quelque chose que vous aviez inversé.",
  "report.summary.congrats": "Rien de sûr et faux cette fois-ci — bien calibré.",
  "report.connectingLine": "Vous avez eu tort sur {wrongCount} des {totalCount} questions « {label} » avec plus de {confidenceFloor} % de confiance.",
  "report.tier2Pending": "étiquette de taxonomie — traitement en attente (ticket 21)",

  "rule.relational-flip": "inversion d'opérateur relationnel",
  "rule.equality-swap": "substitution d'opérateur d'égalité",
  "rule.logical-flip": "inversion d'opérateur logique",
  "rule.arithmetic-swap": "substitution d'opérateur arithmétique",
  "rule.boolean-literal-flip": "inversion d'un littéral booléen",
  "rule.negation-removal": "négation supprimée",
  "rule.negation-insertion": "négation ajoutée",
  "rule.off-by-one-literal": "décalage d'un sur un littéral",
  "rule.return-deletion": "return supprimé",
  "rule.loop-bound-change": "changement de borne de boucle",

  "output.timeout": "dépasse le délai",
  "output.error": "lève {errorName}",

  "error.noMutant": "Aucun mutant de {name} n'a changé sa sortie sur les entrées par défaut : il n'y a rien à demander.",
  "error.failed": "Le viva n'a pas pu s'exécuter : {message}",

  "scope.jsx": "JSX/React",
  "scope.dom": "touche le DOM",
  "scope.network": "touche le réseau",
  "scope.parse-error": "n'a pas pu être analysé",

  "fallback.reason.demo-switch": "forcé par l'interrupteur de démo",
  "fallback.reason.filter-prompt-missing": "le prompt de filtrage n'a pas encore été écrit",
  "fallback.reason.provider-chain-failed": "tous les fournisseurs ont échoué",
  "fallback.reason.filter-endpoint-unreachable": "impossible d'atteindre le point d'accès de filtrage",
  "fallback.reason.no-mutant-loaded": "le modèle n'a chargé aucun mutant pour cette fonction",
  "fallback.reason.all-mutants-equivalent": "tous les mutants chargés par le modèle pour cette fonction étaient équivalents : aucune entrée n'a changé la sortie",
  "fallback.reason.withDetail": "{reason} : {detail}",
};
