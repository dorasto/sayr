import type { schema } from "@repo/database";
import { 
  IconCalendar, 
  IconFlag, 
  IconTag, 
  IconUser, 
  IconCircle,
  IconTextSize
} from "@tabler/icons-react";
import type { FilterFieldConfig, FilterCondition, FilterState, FilterOperator } from "./types";

// Status options with colors matching your system
const STATUS_OPTIONS = [
  { value: 'backlog', label: 'Backlog', color: '#6B7280' },
  { value: 'todo', label: 'Todo', color: '#3B82F6' },
  { value: 'in-progress', label: 'In Progress', color: '#F59E0B' },
  { value: 'done', label: 'Done', color: '#10B981' },
  { value: 'canceled', label: 'Canceled', color: '#EF4444' },
];

const PRIORITY_OPTIONS = [
  { value: 'none', label: 'No Priority', color: '#9CA3AF' },
  { value: 'low', label: 'Low', color: '#3B82F6' },
  { value: 'medium', label: 'Medium', color: '#F59E0B' },
  { value: 'high', label: 'High', color: '#EF4444' },
  { value: 'urgent', label: 'Urgent', color: '#DC2626' },
];

export const FILTER_FIELD_CONFIGS: FilterFieldConfig[] = [
  {
    field: 'status',
    label: 'Status',
    icon: <IconCircle className="w-4 h-4" />,
    operators: ['equals', 'not_equals', 'in', 'not_in'],
    getOptions: () => STATUS_OPTIONS,
  },
  {
    field: 'priority',
    label: 'Priority', 
    icon: <IconFlag className="w-4 h-4" />,
    operators: ['equals', 'not_equals', 'in', 'not_in'],
    getOptions: () => PRIORITY_OPTIONS,
  },
  {
    field: 'assignee',
    label: 'Assignee',
    icon: <IconUser className="w-4 h-4" />,
    operators: ['equals', 'not_equals', 'in', 'not_in', 'is_empty', 'is_not_empty'],
    getOptions: (tasks, _labels, users) => {
      const uniqueAssignees = new Set<string>();
      tasks.forEach(task => {
        task.assignees?.forEach(assignee => uniqueAssignees.add(assignee.id));
      });
      
      return users
        .filter(user => uniqueAssignees.has(user.id))
        .map(user => ({
          value: user.id,
          label: user.name || 'Unknown User',
        }));
    },
  },
  {
    field: 'label',
    label: 'Label',
    icon: <IconTag className="w-4 h-4" />,
    operators: ['equals', 'not_equals', 'in', 'not_in', 'is_empty', 'is_not_empty'],
    getOptions: (_tasks, labels) => {
      return labels.map(label => ({
        value: label.id,
        label: label.name,
        color: label.color || '#cccccc',
      }));
    },
  },
  {
    field: 'creator',
    label: 'Creator',
    icon: <IconUser className="w-4 h-4" />,
    operators: ['equals', 'not_equals', 'in', 'not_in'],
    getOptions: (tasks, _labels, users) => {
      const uniqueCreators = new Set<string>();
      tasks.forEach(task => {
        if (task.createdBy?.id) uniqueCreators.add(task.createdBy.id);
      });
      
      return users
        .filter(user => uniqueCreators.has(user.id))
        .map(user => ({
          value: user.id,
          label: user.name || 'Unknown User',
        }));
    },
  },
  {
    field: 'created_at',
    label: 'Created',
    icon: <IconCalendar className="w-4 h-4" />,
    operators: ['before', 'after', 'between'],
  },
  {
    field: 'updated_at', 
    label: 'Updated',
    icon: <IconCalendar className="w-4 h-4" />,
    operators: ['before', 'after', 'between'],
  },
  {
    field: 'title',
    label: 'Title',
    icon: <IconTextSize className="w-4 h-4" />,
    operators: ['contains', 'not_contains', 'equals', 'not_equals'],
  },
];

// Filter application logic
export function applyFilters(
  tasks: schema.TaskWithLabels[],
  filterState: FilterState
): schema.TaskWithLabels[] {
  if (filterState.groups.length === 0) {
    return tasks;
  }

  return tasks.filter(task => {
    const groupResults = filterState.groups.map(group => {
      const conditionResults = group.conditions.map(condition => 
        evaluateCondition(task, condition)
      );
      
      return group.operator === 'AND' 
        ? conditionResults.every(result => result)
        : conditionResults.some(result => result);
    });
    
    return filterState.operator === 'AND'
      ? groupResults.every(result => result)
      : groupResults.some(result => result);
  });
}

function evaluateCondition(
  task: schema.TaskWithLabels, 
  condition: FilterCondition
): boolean {
  const { field, operator, value } = condition;
  
  switch (field) {
    case 'status':
      return evaluateStringField(task.status, operator, value);
      
    case 'priority':
      return evaluateStringField(task.priority, operator, value);
      
    case 'assignee': {
      const assigneeIds = task.assignees?.map(a => a.id) || [];
      return evaluateArrayField(assigneeIds, operator, value);
    }
      
    case 'label': {
      const labelIds = task.labels?.map(l => l.id) || [];
      return evaluateArrayField(labelIds, operator, value);
    }
      
    case 'creator':
      return evaluateStringField(task.createdBy?.id, operator, value);
      
    case 'created_at':
      return evaluateDateField(task.createdAt, operator, value);
      
    case 'updated_at':
      return evaluateDateField(task.updatedAt, operator, value);
      
    case 'title':
      return evaluateStringField(task.title, operator, value);
      
    default:
      return true;
  }
}

function evaluateStringField(
  fieldValue: string | null | undefined,
  operator: FilterOperator,
  filterValue: string | string[] | Date | null
): boolean {
  const val = fieldValue || '';
  const filterVal = filterValue as string;
  const filterVals = Array.isArray(filterValue) ? filterValue : [filterValue];
  
  switch (operator) {
    case 'equals':
      return val === filterVal;
    case 'not_equals':
      return val !== filterVal;
    case 'contains':
      return val.toLowerCase().includes(filterVal?.toLowerCase() || '');
    case 'not_contains':
      return !val.toLowerCase().includes(filterVal?.toLowerCase() || '');
    case 'in':
      return filterVals.includes(val);
    case 'not_in':
      return !filterVals.includes(val);
    case 'is_empty':
      return !val || val.trim() === '';
    case 'is_not_empty':
      return !!(val && val.trim() !== '');
    default:
      return true;
  }
}

function evaluateArrayField(
  fieldArray: string[],
  operator: FilterOperator,
  filterValue: string | string[] | Date | null
): boolean {
  const filterVals = Array.isArray(filterValue) ? filterValue : filterValue ? [filterValue as string] : [];
  
  switch (operator) {
    case 'equals':
      return fieldArray.length === 1 && fieldArray[0] === filterValue;
    case 'not_equals':
      return fieldArray.length !== 1 || fieldArray[0] !== filterValue;
    case 'in':
      return filterVals.some(val => fieldArray.includes(val));
    case 'not_in':
      return !filterVals.some(val => fieldArray.includes(val));
    case 'is_empty':
      return fieldArray.length === 0;
    case 'is_not_empty':
      return fieldArray.length > 0;
    default:
      return true;
  }
}

function evaluateDateField(
  fieldValue: Date | string | null | undefined,
  operator: FilterOperator,
  filterValue: string | string[] | Date | null
): boolean {
  if (!fieldValue) return false;
  
  const fieldDate = fieldValue instanceof Date ? fieldValue : new Date(fieldValue);
  const filterDate = filterValue instanceof Date ? filterValue : filterValue ? new Date(filterValue as string) : null;
  
  if (!filterDate) return false;
  
  switch (operator) {
    case 'before':
      return fieldDate < filterDate;
    case 'after':
      return fieldDate > filterDate;
    case 'equals':
      return fieldDate.toDateString() === filterDate.toDateString();
    // Add between logic here if needed
    default:
      return true;
  }
}