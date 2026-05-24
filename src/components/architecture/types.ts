
import { LucideIcon } from 'lucide-react';

export interface Phase {
  id: string;
  label: string;
  color: string;
  icon: LucideIcon;
}

export interface Team {
  id: string;
  name: string;
  icon: LucideIcon;
  color: string;
  phase: string;
}

export interface InterfaceItem {
  id: string;
  name: string;
  color: string;
}

export interface Tool {
  name: string;
  icon: string;
  color: string;
  description: string;
}

export interface PlatformCategory {
  name: string;
  color: string;
  tools: Tool[];
}

export interface Provider {
  name: string;
  icon: string;
  color: string;
}
