export interface ComponentConfig {
  id: string;
  type: string;
  label: string;
  icon: string;
  settings: Record<string, any>;
}

export interface Section {
  id: string;
  type: 'section';
  label: string;
  components: ComponentConfig[];
}

export interface DragItem {
  id: string;
  type: string;
  data: ComponentConfig;
}

export interface EditorState {
  sections: Section[];
  selectedComponent: string | null;
}

export interface PreviewProps {
  sections: Section[];
  settings: {
    theme: string;
    colors: {
      primary: string;
      secondary: string;
      background: string;
      text: string;
    };
    fonts: {
      heading: string;
      body: string;
    };
  };
}