import type { FrameworkName } from './readers/types';

// Chrome runtime messages (popup <-> background <-> content)
export type RuntimeMessage =
  | { type: 'START_PICK'; depth: number }
  | { type: 'PICK_RESULT'; path: string; framework: FrameworkName }
  | { type: 'PICK_ERROR'; error: string; framework?: FrameworkName }
  | { type: 'DETECT_FRAMEWORK' }
  | { type: 'DETECT_RESULT'; available: boolean; framework?: FrameworkName };

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

// CustomEvent detail types for framework detection (content <-> page script)
export interface DetectFrameworkRequest {
  detectId: string;
}

export interface DetectFrameworkResponse {
  detectId: string;
  available: boolean;
  framework?: FrameworkName;
}

// CustomEvent detail types for hover tooltip (content <-> page script)
export interface HoverTreeRequest {
  hoverId: string;
  depth: number;
}

export interface HoverTreeResponse {
  hoverId: string;
  components?: string[];
  framework?: FrameworkName;
  error?: string;
}
