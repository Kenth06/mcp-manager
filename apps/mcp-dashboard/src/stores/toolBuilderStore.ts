import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Parameter, ActionBlock, VisualToolDefinition } from '@/types/tool-builder';
import { createDefaultParameter, createDefaultAction } from '@/types/tool-builder';

interface ToolBuilderState {
  // Tool definition
  name: string;
  description: string;
  parameters: Parameter[];
  actions: ActionBlock[];

  // UI state
  activeTab: 'visual' | 'code' | 'preview';
  showTemplates: boolean;
  expandedParameters: Set<string>;
  expandedActions: Set<string>;
  selectedParameterId: string | null;
  selectedActionId: string | null;

  // Editing state
  isDirty: boolean;
  lastSavedAt: number | null;
  isAutoSaving: boolean;

  // Actions - Tool definition
  setName: (name: string) => void;
  setDescription: (description: string) => void;
  setParameters: (parameters: Parameter[]) => void;
  setActions: (actions: ActionBlock[]) => void;

  // Actions - Parameters
  addParameter: (type?: Parameter['type']) => void;
  updateParameter: (id: string, updates: Partial<Parameter>) => void;
  removeParameter: (id: string) => void;
  reorderParameters: (newOrder: Parameter[]) => void;

  // Actions - ActionBlocks
  addAction: (type?: ActionBlock['type']) => void;
  updateAction: (id: string, updates: Partial<ActionBlock>) => void;
  removeAction: (id: string) => void;
  reorderActions: (newOrder: ActionBlock[]) => void;

  // Actions - UI
  setActiveTab: (tab: 'visual' | 'code' | 'preview') => void;
  setShowTemplates: (show: boolean) => void;
  toggleParameterExpanded: (id: string) => void;
  toggleActionExpanded: (id: string) => void;
  setSelectedParameter: (id: string | null) => void;
  setSelectedAction: (id: string | null) => void;

  // Actions - State management
  loadTool: (tool: Partial<VisualToolDefinition> & { name?: string; description?: string }) => void;
  resetTool: () => void;
  markSaved: () => void;
  getToolDefinition: () => { name: string; description: string; parameters: Parameter[]; actions: ActionBlock[] };
}

const STORAGE_KEY = 'tool-builder-draft';

// Debounce auto-save
let autoSaveTimeout: ReturnType<typeof setTimeout> | null = null;

export const useToolBuilderStore = create<ToolBuilderState>()(
  persist(
    (set, get) => ({
      // Initial state
      name: '',
      description: '',
      parameters: [],
      actions: [],
      activeTab: 'visual',
      showTemplates: true,
      expandedParameters: new Set<string>(),
      expandedActions: new Set<string>(),
      selectedParameterId: null,
      selectedActionId: null,
      isDirty: false,
      lastSavedAt: null,
      isAutoSaving: false,

      // Tool definition actions
      setName: (name) => {
        set({ name, isDirty: true });
        triggerAutoSave();
      },

      setDescription: (description) => {
        set({ description, isDirty: true });
        triggerAutoSave();
      },

      setParameters: (parameters) => {
        set({ parameters, isDirty: true });
        triggerAutoSave();
      },

      setActions: (actions) => {
        set({ actions, isDirty: true });
        triggerAutoSave();
      },

      // Parameter actions
      addParameter: (type = 'string') => {
        const newParam = createDefaultParameter(type);
        const expanded = new Set(get().expandedParameters);
        expanded.add(newParam.id);
        set((state) => ({
          parameters: [...state.parameters, newParam],
          expandedParameters: expanded,
          selectedParameterId: newParam.id,
          isDirty: true,
        }));
        triggerAutoSave();
      },

      updateParameter: (id, updates) => {
        set((state) => ({
          parameters: state.parameters.map((p) =>
            p.id === id ? ({ ...p, ...updates } as Parameter) : p
          ),
          isDirty: true,
        }));
        triggerAutoSave();
      },

      removeParameter: (id) => {
        const expanded = new Set(get().expandedParameters);
        expanded.delete(id);
        set((state) => ({
          parameters: state.parameters.filter((p) => p.id !== id),
          expandedParameters: expanded,
          selectedParameterId: state.selectedParameterId === id ? null : state.selectedParameterId,
          isDirty: true,
        }));
        triggerAutoSave();
      },

      reorderParameters: (newOrder) => {
        set({ parameters: newOrder, isDirty: true });
        triggerAutoSave();
      },

      // Action block actions
      addAction: (type = 'http-request') => {
        const newAction = createDefaultAction(type);
        const expanded = new Set(get().expandedActions);
        expanded.add(newAction.id);
        set((state) => ({
          actions: [...state.actions, newAction],
          expandedActions: expanded,
          selectedActionId: newAction.id,
          isDirty: true,
        }));
        triggerAutoSave();
      },

      updateAction: (id, updates) => {
        set((state) => ({
          actions: state.actions.map((a) =>
            a.id === id ? { ...a, ...updates } : a
          ),
          isDirty: true,
        }));
        triggerAutoSave();
      },

      removeAction: (id) => {
        const expanded = new Set(get().expandedActions);
        expanded.delete(id);
        set((state) => ({
          actions: state.actions.filter((a) => a.id !== id),
          expandedActions: expanded,
          selectedActionId: state.selectedActionId === id ? null : state.selectedActionId,
          isDirty: true,
        }));
        triggerAutoSave();
      },

      reorderActions: (newOrder) => {
        set({ actions: newOrder, isDirty: true });
        triggerAutoSave();
      },

      // UI actions
      setActiveTab: (tab) => set({ activeTab: tab }),
      setShowTemplates: (show) => set({ showTemplates: show }),

      toggleParameterExpanded: (id) => {
        const expanded = new Set(get().expandedParameters);
        if (expanded.has(id)) {
          expanded.delete(id);
        } else {
          expanded.add(id);
        }
        set({ expandedParameters: expanded });
      },

      toggleActionExpanded: (id) => {
        const expanded = new Set(get().expandedActions);
        if (expanded.has(id)) {
          expanded.delete(id);
        } else {
          expanded.add(id);
        }
        set({ expandedActions: expanded });
      },

      setSelectedParameter: (id) => set({ selectedParameterId: id, selectedActionId: null }),
      setSelectedAction: (id) => set({ selectedActionId: id, selectedParameterId: null }),

      // State management
      loadTool: (tool) => {
        set({
          name: tool.name || '',
          description: tool.description || '',
          parameters: tool.parameters || [],
          actions: tool.actions || [],
          showTemplates: false,
          isDirty: false,
          expandedParameters: new Set<string>(),
          expandedActions: new Set<string>(),
          selectedParameterId: null,
          selectedActionId: null,
        });
      },

      resetTool: () => {
        set({
          name: '',
          description: '',
          parameters: [],
          actions: [],
          activeTab: 'visual',
          showTemplates: true,
          expandedParameters: new Set<string>(),
          expandedActions: new Set<string>(),
          selectedParameterId: null,
          selectedActionId: null,
          isDirty: false,
          lastSavedAt: null,
        });
        // Clear persisted data
        if (typeof window !== 'undefined') {
          localStorage.removeItem(STORAGE_KEY);
        }
      },

      markSaved: () => {
        set({
          isDirty: false,
          lastSavedAt: Date.now(),
          isAutoSaving: false,
        });
      },

      getToolDefinition: () => {
        const { name, description, parameters, actions } = get();
        return { name, description, parameters, actions };
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        name: state.name,
        description: state.description,
        parameters: state.parameters,
        actions: state.actions,
        activeTab: state.activeTab,
      }),
      // Custom serialization to handle Set
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          const data = JSON.parse(str);
          return {
            state: {
              ...data.state,
              expandedParameters: new Set<string>(),
              expandedActions: new Set<string>(),
            },
          };
        },
        setItem: (name, value) => {
          localStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
);

function triggerAutoSave() {
  if (autoSaveTimeout) {
    clearTimeout(autoSaveTimeout);
  }

  useToolBuilderStore.setState({ isAutoSaving: true });

  autoSaveTimeout = setTimeout(() => {
    useToolBuilderStore.setState({ isAutoSaving: false });
    // The persist middleware handles actual saving
  }, 1000);
}
