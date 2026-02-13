import type { FrameworkName } from './readers/types';

// Chrome runtime messages (popup <-> background <-> content)
export type RuntimeMessage =
  | { type: 'START_PICK'; depth: number }
  | { type: 'PICK_RESULT'; path: string; framework: FrameworkName }
  | { type: 'PICK_ERROR'; error: string; framework?: FrameworkName };

// CustomEvent detail types (content <-> page script)
export interface FiberPathRequest {
  pickId: string;
  depth: number;
}

export interface FiberPathResponse {
  pickId: string;
  path?: string;
  error?: string;
  framework?: FrameworkName;
}
