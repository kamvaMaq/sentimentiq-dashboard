declare module "vader-sentiment" {
  export class SentimentIntensityAnalyzer {
    polarity_scores(text: string): {
      neg: number;
      neu: number;
      pos: number;
      compound: number;
    };
  }
}
