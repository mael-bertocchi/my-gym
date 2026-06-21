import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Maybe } from '@/shared/models';

/**
 * @type MuscleGroup
 * @description The backend MuscleGroup enum as a string-literal union (used verbatim on the wire).
 */
export type MuscleGroup =
    | 'CHEST' | 'UPPER_BACK' | 'LATS' | 'LOWER_BACK' | 'TRAPEZIUS'
    | 'FRONT_DELTS' | 'SIDE_DELTS' | 'REAR_DELTS'
    | 'BICEPS' | 'TRICEPS' | 'FOREARMS'
    | 'QUADRICEPS' | 'HAMSTRINGS' | 'GLUTES' | 'CALVES'
    | 'ABS' | 'OBLIQUES' | 'ADDUCTORS' | 'ABDUCTORS' | 'NECK' | 'FULL_BODY';

/**
 * @type EquipmentType
 * @description The backend EquipmentType enum as a string-literal union.
 */
export type EquipmentType =
    | 'BARBELL' | 'DUMBBELL' | 'MACHINE' | 'SMITH_MACHINE' | 'CABLE' | 'PLATE_LOADED'
    | 'KETTLEBELL' | 'RESISTANCE_BAND' | 'BODYWEIGHT' | 'EZ_BAR' | 'TRAP_BAR' | 'OTHER';

/**
 * @type AiContentStatus
 * @description The backend variant onboarding status. Create/regenerate only ever return GENERATED or FAILED; PENDING is exclusively the client-side optimistic window.
 */
export type AiContentStatus = 'PENDING' | 'GENERATED' | 'FAILED';

/**
 * @type AiCardState
 * @description The rendering state a VariantCard derives from aiContentStatus.
 */
export type AiCardState = 'pending' | 'generated' | 'failed';

/**
 * @interface Exercise
 * @description An exercise as returned by GET /exercises.
 */
export interface Exercise {
    id: string; /*!< Exercise UUID */
    name: string; /*!< Display name */
    primaryMuscle: MuscleGroup; /*!< The primary worked muscle */
    secondaryMuscles: MuscleGroup[]; /*!< Optional secondary muscles */
    isArchived: boolean; /*!< Whether the exercise is archived */
    createdAt: string; /*!< ISO creation timestamp */
    updatedAt: string; /*!< ISO update timestamp */
}

/**
 * @interface ExerciseVariant
 * @description A variant as returned by the API; the machine-brand name is resolved client-side.
 */
export interface ExerciseVariant {
    id: string; /*!< Variant UUID (a temp id while LOCAL-PENDING) */
    exerciseId: string; /*!< Owning exercise UUID */
    equipmentType: EquipmentType; /*!< The equipment used */
    machineBrandId: Maybe<string>; /*!< Brand UUID for MACHINE variants, else null */
    formSummary: Maybe<string>; /*!< AI: form summary */
    instructions: Maybe<string>; /*!< AI: how-to instructions */
    equipmentTips: Maybe<string>; /*!< AI: equipment tips */
    previewImageUrl: Maybe<string>; /*!< Optional preview image URL */
    aiContentStatus: AiContentStatus; /*!< Onboarding status (PENDING only client-side) */
    aiGeneratedAt: Maybe<string>; /*!< ISO timestamp set on successful generation */
    createdAt: string; /*!< ISO creation timestamp */
    updatedAt: string; /*!< ISO update timestamp */
}

/**
 * @interface MachineBrand
 * @description A machine brand as returned by GET /machine-brands.
 */
export interface MachineBrand {
    id: string; /*!< Brand UUID */
    name: string; /*!< Brand name */
    createdAt: string; /*!< ISO creation timestamp */
    updatedAt: string; /*!< ISO update timestamp */
}

/**
 * @interface CreateExerciseInput
 * @description Request body for POST /exercises.
 */
export interface CreateExerciseInput {
    name: string; /*!< 1–120 chars */
    primaryMuscle: MuscleGroup; /*!< The primary muscle */
    secondaryMuscles: MuscleGroup[]; /*!< Optional secondary muscles */
}

/**
 * @interface CreateVariantInput
 * @description Local input for creating a variant (exerciseId is supplied by the hook).
 */
export interface CreateVariantInput {
    equipmentType: EquipmentType; /*!< The equipment used */
    machineBrandId: Maybe<string>; /*!< Required when equipmentType is MACHINE, else null */
}

/**
 * @constant MUSCLE_GROUPS
 * @description Ordered list of every MuscleGroup for chip grids.
 */
export const MUSCLE_GROUPS: MuscleGroup[] = [
    'CHEST', 'UPPER_BACK', 'LATS', 'LOWER_BACK', 'TRAPEZIUS',
    'FRONT_DELTS', 'SIDE_DELTS', 'REAR_DELTS',
    'BICEPS', 'TRICEPS', 'FOREARMS',
    'QUADRICEPS', 'HAMSTRINGS', 'GLUTES', 'CALVES',
    'ABS', 'OBLIQUES', 'ADDUCTORS', 'ABDUCTORS', 'NECK', 'FULL_BODY'
];

/**
 * @constant EQUIPMENT_TYPES
 * @description Ordered list of every EquipmentType for the equipment grid.
 */
export const EQUIPMENT_TYPES: EquipmentType[] = [
    'BARBELL', 'DUMBBELL', 'MACHINE', 'SMITH_MACHINE', 'CABLE', 'PLATE_LOADED',
    'KETTLEBELL', 'RESISTANCE_BAND', 'BODYWEIGHT', 'EZ_BAR', 'TRAP_BAR', 'OTHER'
];

/**
 * @constant EQUIPMENT_ICONS
 * @description Maps each EquipmentType to a MaterialCommunityIcons glyph for the equipment grid.
 */
export const EQUIPMENT_ICONS: Record<EquipmentType, keyof typeof MaterialCommunityIcons.glyphMap> = {
    BARBELL: 'weight-lifter',
    DUMBBELL: 'dumbbell',
    MACHINE: 'cog',
    SMITH_MACHINE: 'view-grid',
    CABLE: 'cable-data',
    PLATE_LOADED: 'circle-slice-8',
    KETTLEBELL: 'kettlebell',
    RESISTANCE_BAND: 'rotate-orbit',
    BODYWEIGHT: 'human',
    EZ_BAR: 'minus',
    TRAP_BAR: 'hexagon-outline',
    OTHER: 'dots-horizontal'
};

/**
 * @constant AI_CARD_STATE
 * @description Maps each AiContentStatus to its rendering card state.
 */
const AI_CARD_STATE: Record<AiContentStatus, AiCardState> = {
    PENDING: 'pending',
    GENERATED: 'generated',
    FAILED: 'failed'
};

/**
 * @function humanizeEnum
 * @description Converts an UPPER_SNAKE_CASE enum value into a human label (e.g. SIDE_DELTS -> "Side delts").
 *
 * @param {string} value The raw enum value.
 * @returns {string} The humanized label.
 */
export function humanizeEnum(value: string): string {
    if (value.length === 0) {
        return '';
    }
    const lower: string = value.toLowerCase().replace(/_/g, ' ');
    return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/**
 * @function deriveAiState
 * @description Derives the VariantCard rendering state from the variant's AiContentStatus.
 *
 * @param {AiContentStatus} status The variant's AI content status.
 * @returns {AiCardState} The card rendering state.
 */
export function deriveAiState(status: AiContentStatus): AiCardState {
    return AI_CARD_STATE[status];
}
