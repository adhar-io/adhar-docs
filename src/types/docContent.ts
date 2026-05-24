
export interface DocMetadata {
  title: string;
  description: string;
  lastUpdated: string;
  readTime: string;
  category: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  tags?: string[];
}

export interface CodeExample {
  id: string;
  title: string;
  language: string;
  code: string;
  description: string;
  runnable: boolean;
}

export interface DocContent {
  metadata: DocMetadata;
  content: string;
  codeExamples?: CodeExample[];
}
