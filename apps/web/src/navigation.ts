export type ProblemReturnSource = "gesp" | "atcoder";

export type ProblemReturnContext = {
  source: ProblemReturnSource;
  sourcePath: string;
  problemId: string;
  scrollY: number;
  gesp?: {
    activeDomainId: string | null;
    searchQuery: string;
    selectedLevel: number;
  };
  atcoder?: {
    activeDomainId: string | null;
    difficulty: string;
    searchQuery: string;
  };
};

export type NavigateOptions = {
  returnContext?: ProblemReturnContext;
  scroll?: "preserve" | "top";
};

export type Navigate = (path: string, options?: NavigateOptions) => void;

export type OpenIde = (problemId: string, returnContext?: ProblemReturnContext) => void;
