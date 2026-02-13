export type FrameworkName = 'react' | 'vue' | 'angular' | 'svelte';

export interface ComponentReadResult {
  framework: FrameworkName;
  components: string[];
}

export interface FrameworkReader {
  name: FrameworkName;
  read(el: Element): ComponentReadResult | null;
}
