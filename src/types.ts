export type CocktailCategory =
  | "classic"
  | "tropical"
  | "refreshing"
  | "strong"
  | "signature";

export type PreparationTechnique =
  | "shake"
  | "stir"
  | "build"
  | "muddle"
  | "strain"
  | "garnish"
  | "serve";

export type GlassType = "margarita" | "highball" | "rocks" | "coupe";

export type Ingredient = {
  name: string;
  amount: string;
  color: string;
};

export type PreparationStep = {
  id: string;
  title: string;
  description: string;
  technique: PreparationTechnique;
  ingredientName?: string;
};

export type Cocktail = {
  id: string;
  name: string;
  subtitle: string;
  category: CocktailCategory;
  glass: string;
  glassType: GlassType;
  difficulty: "Kolay" | "Orta" | "İleri";
  durationMinutes: number;
  tasteProfile: string[];
  ingredients: Ingredient[];
  steps: PreparationStep[];
};