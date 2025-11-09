export type Ingredient = {
  name: string;
  quantity?: number | string;
  unit?: string;
  optional?: boolean;
};

export type Instruction = {
  step: number;
  description: string;
  timeMinutes?: number;
};

export type Nutrition = {
  calories?: number;
  protein?: string;
  fat?: string;
  carbohydrates?: string;
};

export type Recipe = {
  recipeName: string;
  servings?: number;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  totalTimeMinutes?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  cuisine?: string;
  category?: string;
  ingredients: Ingredient[];
  instructions: Instruction[];
  tips?: string[];
  nutritionPerServing?: Nutrition;
};
