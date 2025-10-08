import { z } from "zod"

/**
 * Fork Types - Data structures for conversation forking functionality
 * 
 * This module defines the core types needed to support conversation forking in Kilocode,
 * enabling users to create alternative conversation branches from any point in a task's history.
 */

// =============================================================================
// Core Fork Types
// =============================================================================

/**
 * Unique identifier for a fork
 * Format: {taskId}-fork-{timestamp}-{shortHash}
 */
export type ForkId = string

/**
 * Unique identifier for a branch in the fork tree
 * The root task uses its taskId as the branchId
 */
export type BranchId = string

/**
 * ForkMetadata - Core information about a conversation fork
 * 
 * Stores essential metadata about when and where a fork was created,
 * enabling efficient fork tracking and message sharing.
 */
export const forkMetadataSchema = z.object({
	/** Unique identifier for this fork */
	forkId: z.string(),
	
	/** ID of the parent task from which this fork was created */
	parentTaskId: z.string(),
	
	/** Message index in the parent's history where the fork occurred (0-based) */
	forkPointIndex: z.number().int().min(0),
	
	/** Timestamp when the fork was created (milliseconds since epoch) */
	forkTimestamp: z.number().int().positive(),
	
	/** Optional user-defined name for this branch (e.g., "try-alternative-approach") */
	branchName: z.string().optional(),
	
	/** Brief description of why this fork was created */
	description: z.string().optional(),
})

export type ForkMetadata = z.infer<typeof forkMetadataSchema>

/**
 * BranchInfo - Tracks relationships in the fork tree
 * 
 * Maintains the hierarchical structure of conversation branches,
 * allowing navigation up and down the fork tree.
 */
export const branchInfoSchema = z.object({
	/** Unique identifier for this branch (taskId for root, forkId for forked branches) */
	branchId: z.string(),
	
	/** ID of the parent branch, undefined for root task */
	parentBranchId: z.string().optional(),
	
	/** Array of child branch IDs that forked from this branch */
	childBranchIds: z.array(z.string()),
	
	/** Depth in the fork tree (0 = root, 1 = first-level fork, etc.) */
	depth: z.number().int().min(0),
	
	/** Timestamp of the most recent activity on this branch */
	lastActiveTimestamp: z.number().int().positive(),
	
	/** Whether this branch has been marked as archived/inactive */
	isArchived: z.boolean().optional(),
})

export type BranchInfo = z.infer<typeof branchInfoSchema>

/**
 * ForkRegistry - Central index of all forks in a conversation tree
 * 
 * Provides efficient lookup and navigation of the entire fork structure.
 * Stored as part of the root task's metadata.
 */
export const forkRegistrySchema = z.object({
	/** ID of the root task (the original, unfrozen conversation) */
	rootTaskId: z.string(),
	
	/** Map of forkId -> ForkMetadata for all forks in this tree */
	forks: z.record(z.string(), forkMetadataSchema),
	
	/** Map of branchId -> BranchInfo for navigating the fork tree */
	branchTree: z.record(z.string(), branchInfoSchema),
	
	/** Version number for the registry schema (for future migrations) */
	version: z.number().int().positive().default(1),
	
	/** Timestamp of the last update to this registry */
	lastUpdated: z.number().int().positive(),
})

export type ForkRegistry = z.infer<typeof forkRegistrySchema>

// =============================================================================
// Message Sharing Types
// =============================================================================

/**
 * SharedMessageRange - Defines a contiguous range of messages shared from a parent
 * 
 * Supports efficient message sharing using a copy-on-write strategy.
 * Messages in this range are not duplicated but referenced from the parent.
 */
export const sharedMessageRangeSchema = z.object({
	/** ID of the task from which messages are shared */
	sourceTaskId: z.string(),
	
	/** Start index (inclusive) in the source task's message array */
	startIndex: z.number().int().min(0),
	
	/** End index (exclusive) in the source task's message array */
	endIndex: z.number().int().min(0),
	
	/** Hash of the shared message range for validation */
	contentHash: z.string().optional(),
})

export type SharedMessageRange = z.infer<typeof sharedMessageRangeSchema>

/**
 * MessageOwnership - Tracks whether messages are owned or shared
 * 
 * Enables efficient copy-on-write semantics for forked conversations.
 */
export type MessageOwnership = "owned" | "shared"

/**
 * MessageMetadata - Extended metadata for messages in forked conversations
 * 
 * Tracks the source and ownership of individual messages.
 */
export const messageMetadataSchema = z.object({
	/** Whether this message is owned by this task or shared from parent */
	ownership: z.enum(["owned", "shared"]),
	
	/** If shared, the source task ID from which this message is referenced */
	sourceTaskId: z.string().optional(),
	
	/** If shared, the original index in the source task */
	sourceIndex: z.number().int().min(0).optional(),
	
	/** Marker indicating this message is a fork point */
	isForkPoint: z.boolean().optional(),
	
	/** IDs of child branches that fork from this message */
	childForks: z.array(z.string()).optional(),
})

export type MessageMetadata = z.infer<typeof messageMetadataSchema>

// =============================================================================
// Task Extensions
// =============================================================================

/**
 * ForkOptions - Fork-specific options when creating a task
 * 
 * Extends CreateTaskOptions to support fork creation.
 */
export const forkOptionsSchema = z.object({
	/** ID of the parent task to fork from */
	parentTaskId: z.string().optional(),
	
	/** Message index in parent's history to fork from */
	forkPointIndex: z.number().int().min(0).optional(),
	
	/** Optional user-defined branch name */
	branchName: z.string().optional(),
	
	/** Description of why this fork was created */
	description: z.string().optional(),
	
	/** Whether to copy messages (true) or share them (false, default) */
	copyMessages: z.boolean().default(false),
})

export type ForkOptions = z.infer<typeof forkOptionsSchema>

/**
 * TaskForkMetadata - Fork-related metadata stored in a Task
 * 
 * Extends TaskMetadata to include fork information.
 * This should be added to the existing TaskMetadata interface.
 */
export const taskForkMetadataSchema = z.object({
	/** If this is a forked task, contains fork metadata */
	fork: forkMetadataSchema.optional(),
	
	/** Ranges of messages shared from parent task */
	sharedMessageRanges: z.array(sharedMessageRangeSchema).optional(),
	
	/** Branch information for this task */
	branch: branchInfoSchema.optional(),
	
	/** If this is the root task, contains the fork registry */
	forkRegistry: forkRegistrySchema.optional(),
})

export type TaskForkMetadata = z.infer<typeof taskForkMetadataSchema>

// =============================================================================
// History Extensions
// =============================================================================

/**
 * HistoryItemForkExtension - Fork-related fields for HistoryItem
 * 
 * These fields should be added to the existing HistoryItem type
 * to support fork visualization in the task history UI.
 */
export const historyItemForkExtensionSchema = z.object({
	/** If this is a forked task, the fork ID */
	forkId: z.string().optional(),
	
	/** If this is a forked task, the branch name */
	branchName: z.string().optional(),
	
	/** Branch depth (0 = root, 1 = first fork, etc.) */
	branchDepth: z.number().int().min(0).optional(),
	
	/** Number of child forks created from this task */
	childForkCount: z.number().int().min(0).optional(),
	
	/** Whether this task is part of a fork tree */
	isForked: z.boolean().optional(),
})

export type HistoryItemForkExtension = z.infer<typeof historyItemForkExtensionSchema>

// =============================================================================
// Fork Navigation & Query Types
// =============================================================================

/**
 * ForkTreeNode - Represents a node in the fork tree for visualization
 * 
 * Used for rendering fork trees in the UI.
 */
export interface ForkTreeNode {
	/** Task or fork ID */
	id: string
	
	/** User-facing label (branch name or task title) */
	label: string
	
	/** Parent node ID */
	parentId?: string
	
	/** Child node IDs */
	childIds: string[]
	
	/** Tree depth */
	depth: number
	
	/** Whether this is the currently active branch */
	isActive: boolean
	
	/** Timestamp of last activity */
	lastActive: number
	
	/** Number of messages in this branch */
	messageCount: number
	
	/** Brief preview of the branch's purpose */
	description?: string
}

/**
 * ForkNavigationInfo - Information needed to navigate to a fork
 * 
 * Returned when querying for fork details.
 */
export interface ForkNavigationInfo {
	/** The fork or task ID to navigate to */
	targetId: string
	
	/** Path from root to this fork */
	path: string[]
	
	/** Metadata about the target fork */
	metadata: ForkMetadata
	
	/** Branch information */
	branchInfo: BranchInfo
}

/**
 * ForkQueryOptions - Options for querying forks
 */
export interface ForkQueryOptions {
	/** Include archived branches */
	includeArchived?: boolean
	
	/** Maximum depth to traverse */
	maxDepth?: number
	
	/** Filter by branch name pattern */
	branchNamePattern?: string
	
	/** Sort order for results */
	sortBy?: "lastActive" | "createdAt" | "depth" | "messageCount"
	
	/** Sort direction */
	sortDirection?: "asc" | "desc"
}

// =============================================================================
// Utility Types
// =============================================================================

/**
 * ForkCreationResult - Result of creating a new fork
 */
export interface ForkCreationResult {
	/** The newly created task instance */
	task: any // Will be TaskLike, but avoiding circular dependency
	
	/** Fork metadata */
	forkMetadata: ForkMetadata
	
	/** Updated fork registry */
	updatedRegistry: ForkRegistry
}

/**
 * MessageSharingStrategy - Strategy for handling messages in forks
 */
export type MessageSharingStrategy = "copy-on-write" | "full-copy" | "reference-only"

/**
 * ForkValidationResult - Result of validating a fork operation
 */
export interface ForkValidationResult {
	/** Whether the fork operation is valid */
	isValid: boolean
	
	/** Error messages if invalid */
	errors: string[]
	
	/** Warning messages */
	warnings: string[]
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Maximum depth of fork trees to prevent infinite nesting
 */
export const MAX_FORK_DEPTH = 10

/**
 * Maximum number of child forks per branch
 */
export const MAX_CHILD_FORKS_PER_BRANCH = 50

/**
 * Default message sharing strategy
 */
export const DEFAULT_MESSAGE_SHARING_STRATEGY: MessageSharingStrategy = "copy-on-write"

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Check if a task has fork metadata
 */
export function hasForkMetadata(task: any): task is { metadata: { fork: ForkMetadata } } {
	return task?.metadata?.fork !== undefined
}

/**
 * Check if a task is the root of a fork tree
 */
export function isRootTask(task: any): task is { metadata: { forkRegistry: ForkRegistry } } {
	return task?.metadata?.forkRegistry !== undefined
}

/**
 * Check if a task has shared messages
 */
export function hasSharedMessages(task: any): boolean {
	return task?.metadata?.sharedMessageRanges?.length > 0
}

/**
 * Check if a message is a fork point
 */
export function isForkPoint(message: any): boolean {
	return message?.metadata?.isForkPoint === true
}

