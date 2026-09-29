export const ALLOWED_GROUPS = [
  "TonyTest",
  "wonderland",
  "SevenFade",
  "eat what",
  "SHOEGAZERS",
  "Star Lab",
  "The Foundry",
  "The Six",
  "Nova",
  "Spark",
  "Septastar",
  "ultraman&woman",
  "Six gods",
  "The Professionals",
  "Hello World",
  "EduVengers",
  "studio 6.0",
  "High-Five",
  "Six Wonders",
  "DreamTeam",
  "Bugless",
  "7-eleva",
  "TUFF",
  "Ungrouped",
] as const;

export function canonicalGroupName(input: string) {
  const clean = input.trim().replace(/\s+/g, " ");
  return ALLOWED_GROUPS.find((name) => name.toLowerCase() === clean.toLowerCase()) ?? null;
}
