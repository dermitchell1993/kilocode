# Fork Data Structures and Types

This document provides comprehensive documentation for the conversation forking data structures in Kilocode.

## Overview

The fork system enables users to create alternative conversation branches from any point in a task's history. This is implemented using a copy-on-write message sharing strategy for efficiency.

## Core Concepts

### Fork Tree Structure

```
Root Task (taskId: "root-123")
├── Fork A (forkId: "root-123-fork-1234567890-abc")
│   └── Fork A.1 (forkId: "root-123-fork-1234567891-def")
└── Fork B (forkId: "root-123-fork-1234567892-ghi")
```

- **Root Task**: The original, unfrozen conversation
- **Fork**: A new conversation branch created from a specific message in the parent
- **Branch**: Each task in the tree represents a branch (root task + all forks)

### Message Sharing Strategy

To avoid duplicating message history, forks use a **copy-on-write** approach:

1. **Shared Messages**: Messages before the fork point are referenced from the parent, not copied
2. **Owned Messages**: Messages after the fork point are owned by the fork
3. **Efficient Storage**: Only new messages consume storage, shared messages are referenced

Example:
```
Parent Task: [M1, M2, M3, M4, M5]
                      ↓ Fork at index 2
Child Fork:  [M1, M2] → [M3', M4', M5'] (new messages)
             ↑shared    ↑owned
```

## Type Definitions

### Core Types

#### `ForkMetadata`

Stores essential information about a conversation fork.

```typescript
interface ForkMetadata {
  forkId: string                  // Unique identifier: {taskId}-fork-{timestamp}-{hash}
  parentTaskId: string            // ID of parent task
  forkPointIndex: number          // 0-based index in parent's history
  forkTimestamp: number           // When fork was created (ms since epoch)
  branchName?: string             // Optional user-defined name
  description?: string            // Why this fork was created
}
```

**Example:**
```typescript
const forkMeta: ForkMetadata = {
  forkId: "task-456-fork-1699000000000-a1b2c3",
  parentTaskId: "task-456",
  forkPointIndex: 5,
  forkTimestamp: 1699000000000,
  branchName: "try-alternative-approach",
  description: "Exploring different algorithm"
}
```

#### `BranchInfo`

Tracks relationships in the fork tree for navigation.

```typescript
interface BranchInfo {
  branchId: string                // taskId for root, forkId for forks
  parentBranchId?: string         // Parent branch ID (undefined for root)
  childBranchIds: string[]        // Array of child fork IDs
  depth: number                   // Tree depth (0 = root)
  lastActiveTimestamp: number     // Most recent activity
  isArchived?: boolean            // Whether branch is archived
}
```

**Example:**
```typescript
const branchInfo: BranchInfo = {
  branchId: "task-456",
  parentBranchId: undefined,
  childBranchIds: ["task-456-fork-1699000000000-a1b2c3"],
  depth: 0,
  lastActiveTimestamp: 1699000000000,
  isArchived: false
}
```

#### `ForkRegistry`

Central index of all forks in a conversation tree. Stored with the root task.

```typescript
interface ForkRegistry {
  rootTaskId: string                           // Root task ID
  forks: Record<string, ForkMetadata>         // Map: forkId → metadata
  branchTree: Record<string, BranchInfo>      // Map: branchId → branch info
  version: number                              // Schema version (default: 1)
  lastUpdated: number                          // Last update timestamp
}
```

**Example:**
```typescript
const registry: ForkRegistry = {
  rootTaskId: "task-456",
  forks: {
    "task-456-fork-1699000000000-a1b2c3": {
      forkId: "task-456-fork-1699000000000-a1b2c3",
      parentTaskId: "task-456",
      forkPointIndex: 5,
      forkTimestamp: 1699000000000
    }
  },
  branchTree: {
    "task-456": {
      branchId: "task-456",
      childBranchIds: ["task-456-fork-1699000000000-a1b2c3"],
      depth: 0,
      lastActiveTimestamp: 1699000000000
    },
    "task-456-fork-1699000000000-a1b2c3": {
      branchId: "task-456-fork-1699000000000-a1b2c3",
      parentBranchId: "task-456",
      childBranchIds: [],
      depth: 1,
      lastActiveTimestamp: 1699000000000
    }
  },
  version: 1,
  lastUpdated: 1699000000000
}
```

### Message Sharing Types

#### `SharedMessageRange`

Defines a contiguous range of messages shared from a parent task.

```typescript
interface SharedMessageRange {
  sourceTaskId: string      // Task from which messages are shared
  startIndex: number        // Start index (inclusive) in source
  endIndex: number          // End index (exclusive) in source
  contentHash?: string      // Hash for validation
}
```

**Example:**
```typescript
const sharedRange: SharedMessageRange = {
  sourceTaskId: "task-456",
  startIndex: 0,
  endIndex: 5,
  contentHash: "sha256:abc123..."
}
```

#### `MessageMetadata`

Extended metadata for messages in forked conversations.

```typescript
interface MessageMetadata {
  ownership: "owned" | "shared"   // Message ownership type
  sourceTaskId?: string           // Source task if shared
  sourceIndex?: number            // Original index in source
  isForkPoint?: boolean           // Whether this is a fork point
  childForks?: string[]           // Fork IDs that branch from here
}
```

**Example:**
```typescript
// Shared message
const sharedMsg: MessageMetadata = {
  ownership: "shared",
  sourceTaskId: "task-456",
  sourceIndex: 3
}

// Fork point message
const forkPointMsg: MessageMetadata = {
  ownership: "owned",
  isForkPoint: true,
  childForks: ["task-456-fork-1699000000000-a1b2c3"]
}
```

### Task Extensions

#### `TaskForkMetadata`

Fork-related metadata stored in a Task. Should be added to existing `TaskMetadata`.

```typescript
interface TaskForkMetadata {
  fork?: ForkMetadata                        // If forked, fork metadata
  sharedMessageRanges?: SharedMessageRange[] // Shared message ranges
  branch?: BranchInfo                        // Branch information
  forkRegistry?: ForkRegistry                // If root, the registry
}
```

**Usage in Task:**
```typescript
interface TaskMetadata {
  task?: string
  images?: string[]
  forkMetadata?: TaskForkMetadata  // Add this field
}
```

#### `ForkOptions`

Options for creating a fork. Extends `CreateTaskOptions`.

```typescript
interface ForkOptions {
  parentTaskId?: string        // Parent task to fork from
  forkPointIndex?: number      // Message index to fork from
  branchName?: string          // Optional branch name
  description?: string         // Fork description
  copyMessages?: boolean       // Copy (true) or share (false, default)
}
```

**Usage:**
```typescript
const options: CreateTaskOptions & ForkOptions = {
  enableDiff: true,
  parentTaskId: "task-456",
  forkPointIndex: 5,
  branchName: "explore-alternative",
  copyMessages: false  // Use copy-on-write
}
```

### History Extensions

#### `HistoryItemForkExtension`

Fork-related fields for `HistoryItem` to support UI visualization.

```typescript
interface HistoryItemForkExtension {
  forkId?: string          // Fork ID if this is a fork
  branchName?: string      // Branch name
  branchDepth?: number     // Tree depth
  childForkCount?: number  // Number of child forks
  isForked?: boolean       // Whether task is part of fork tree
}
```

**Usage in HistoryItem:**
```typescript
interface HistoryItem {
  id: string
  // ... existing fields ...
  
  // Add these fork-related fields
  forkId?: string
  branchName?: string
  branchDepth?: number
  childForkCount?: number
  isForked?: boolean
}
```

## UI/Navigation Types

### `ForkTreeNode`

Represents a node for UI visualization of the fork tree.

```typescript
interface ForkTreeNode {
  id: string              // Task or fork ID
  label: string           // User-facing label
  parentId?: string       // Parent node ID
  childIds: string[]      // Child node IDs
  depth: number           // Tree depth
  isActive: boolean       // Currently active branch
  lastActive: number      // Last activity timestamp
  messageCount: number    // Messages in this branch
  description?: string    // Branch description
}
```

### `ForkNavigationInfo`

Information needed to navigate to a specific fork.

```typescript
interface ForkNavigationInfo {
  targetId: string               // Fork/task ID to navigate to
  path: string[]                 // Path from root to target
  metadata: ForkMetadata        // Target fork metadata
  branchInfo: BranchInfo        // Target branch info
}
```

### `ForkQueryOptions`

Options for querying and filtering forks.

```typescript
interface ForkQueryOptions {
  includeArchived?: boolean         // Include archived branches
  maxDepth?: number                 // Maximum tree depth to traverse
  branchNamePattern?: string        // Filter by name pattern
  sortBy?: "lastActive" | "createdAt" | "depth" | "messageCount"
  sortDirection?: "asc" | "desc"
}
```

## Utility Types

### `ForkCreationResult`

Result of creating a new fork.

```typescript
interface ForkCreationResult {
  task: TaskLike              // The new task instance
  forkMetadata: ForkMetadata  // Fork metadata
  updatedRegistry: ForkRegistry // Updated registry
}
```

### `MessageSharingStrategy`

Strategy for handling messages in forks.

```typescript
type MessageSharingStrategy = 
  | "copy-on-write"     // Share until modified (default)
  | "full-copy"         // Copy all messages
  | "reference-only"    // Only reference, no copies
```

### `ForkValidationResult`

Result of validating a fork operation.

```typescript
interface ForkValidationResult {
  isValid: boolean      // Whether operation is valid
  errors: string[]      // Error messages if invalid
  warnings: string[]    // Warning messages
}
```

## Constants

```typescript
// Maximum depth of fork trees
const MAX_FORK_DEPTH = 10

// Maximum child forks per branch
const MAX_CHILD_FORKS_PER_BRANCH = 50

// Default message sharing strategy
const DEFAULT_MESSAGE_SHARING_STRATEGY = "copy-on-write"
```

## Type Guards

Utility functions for type checking:

```typescript
// Check if task has fork metadata
function hasForkMetadata(task: any): task is { metadata: { fork: ForkMetadata } }

// Check if task is root of fork tree
function isRootTask(task: any): task is { metadata: { forkRegistry: ForkRegistry } }

// Check if task has shared messages
function hasSharedMessages(task: any): boolean

// Check if message is a fork point
function isForkPoint(message: any): boolean
```

## Implementation Considerations

### Backward Compatibility

All fork-related fields are optional, ensuring backward compatibility:
- Existing tasks without forks work unchanged
- Fork metadata is only added when forks are created
- No breaking changes to existing types

### Storage Efficiency

The copy-on-write strategy minimizes storage:
- Shared messages: Only metadata stored (sourceTaskId, indices)
- Owned messages: Full message content stored
- Registry: Stored once at root, indexed for fast lookup

### Performance

- **O(1) lookup** for fork metadata via `forkRegistry.forks` map
- **O(1) lookup** for branch info via `forkRegistry.branchTree` map
- **O(depth)** traversal for navigating fork trees
- Efficient message sharing reduces memory overhead

### Validation

Key validations to implement:
1. Fork depth doesn't exceed `MAX_FORK_DEPTH`
2. Fork point index is within parent's message range
3. Parent task exists and is accessible
4. Prevent circular references in fork tree
5. Validate shared message range consistency

## Example Workflows

### Creating a Fork

```typescript
// 1. User selects message at index 5 in task-456
const forkOptions: ForkOptions = {
  parentTaskId: "task-456",
  forkPointIndex: 5,
  branchName: "try-different-approach"
}

// 2. Create fork with shared messages [0, 5)
const fork = await createTask(text, images, parentTask, forkOptions)

// 3. Fork has:
//    - sharedMessageRanges: [{ sourceTaskId: "task-456", startIndex: 0, endIndex: 5 }]
//    - fork: { forkId, parentTaskId, forkPointIndex, ... }
//    - branch: { branchId: forkId, parentBranchId: "task-456", depth: 1, ... }
```

### Navigating Fork Tree

```typescript
// 1. Load root task's fork registry
const registry = rootTask.metadata.forkMetadata?.forkRegistry

// 2. Get all child forks of current branch
const branchInfo = registry.branchTree[currentTaskId]
const childForks = branchInfo.childBranchIds.map(id => registry.forks[id])

// 3. Navigate to specific fork
const targetFork = registry.forks[targetForkId]
const path = buildPathFromRoot(registry, targetForkId)
```

### Accessing Messages

```typescript
// For a forked task with shared messages:
function getMessage(task: Task, index: number): ClineMessage {
  // Check if index is in shared range
  const sharedRange = task.metadata.forkMetadata?.sharedMessageRanges?.[0]
  
  if (sharedRange && index < sharedRange.endIndex) {
    // Load from parent task
    const parentTask = loadTask(sharedRange.sourceTaskId)
    return parentTask.messages[index]
  } else {
    // Load from current task (adjust index for owned messages)
    const adjustedIndex = index - (sharedRange?.endIndex ?? 0)
    return task.messages[adjustedIndex]
  }
}
```

## Next Steps

After implementing these types, the following components need to be built:

1. **Fork Registry System** - Manage the fork registry lifecycle
2. **Task Class Extensions** - Add fork methods to Task class
3. **Message Loading** - Implement shared message resolution
4. **UI Components** - Visualize fork tree and navigation
5. **Persistence** - Save/load fork metadata with tasks

## References

- Related Issues: Task Class Extensions, Fork Registry System
- Files Modified:
  - `src/core/task/ForkTypes.ts` (new)
  - `src/core/task/types.ts` (extended)
  - `packages/types/src/task.ts` (will be extended)
  - `packages/types/src/history.ts` (will be extended)
  - `packages/types/src/message.ts` (will be extended)

