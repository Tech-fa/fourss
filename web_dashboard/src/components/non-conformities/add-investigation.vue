<template>
    <div class="min-h-screen bg-neutral-50">
        <BreadCrums :crumbs="crumbs"> </BreadCrums>
        <main id="main-content" class="flex-1 p-6">
            <!-- Investigation Header -->
            <div id="investigation-header" class="mb-6">
                <div class="flex items-center justify-between">
                    <div>
                        <div class="flex items-center space-x-3 mb-2">
                            <button class="text-neutral-600 hover:text-neutral-900">
                                <i class="fa-solid fa-arrow-left"></i>
                            </button>
                            <h2 class="text-3xl text-neutral-900">NC Investigation - NC-001</h2>
                        </div>
                        <p class="text-neutral-600">
                            Investigate and determine corrective actions for this non-conformity
                        </p>
                    </div>
                    <div class="flex space-x-3">
                        <button
                            class="px-4 py-2 border border-neutral-300 rounded-md text-neutral-700 hover:bg-neutral-50"
                        >
                            <i class="fa-solid fa-print mr-2"></i>
                            Print
                        </button>
                        <button
                            class="px-4 py-2 bg-neutral-900 text-white rounded-md hover:bg-neutral-800"
                        >
                            <i class="fa-solid fa-save mr-2"></i>
                            Save Investigation
                        </button>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- NC Details Panel -->
                <div id="nc-details-panel" class="lg:col-span-2 space-y-6">
                    <!-- NC Summary Card -->
                    <div class="bg-white border border-neutral-200 rounded-lg p-6">
                        <h3 class="text-lg text-neutral-900 mb-4">Non-Conformity Details</h3>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="text-sm text-neutral-600">Organization Unit</label>
                                <p class="text-neutral-900">Manufacturing</p>
                            </div>
                            <div>
                                <label class="text-sm text-neutral-600">Risk Level</label>
                                <span
                                    class="inline-flex px-2 py-1 text-xs bg-neutral-100 text-neutral-800 rounded-full"
                                    >High</span
                                >
                            </div>
                            <div>
                                <label class="text-sm text-neutral-600">Type</label>
                                <p class="text-neutral-900">Quality</p>
                            </div>
                            <div>
                                <label class="text-sm text-neutral-600">Category</label>
                                <p class="text-neutral-900">Product Defect</p>
                            </div>
                            <div>
                                <label class="text-sm text-neutral-600">Due Date</label>
                                <p class="text-neutral-900">2025-01-15</p>
                            </div>
                            <div>
                                <label class="text-sm text-neutral-600">Representative</label>
                                <p class="text-neutral-900">John Smith</p>
                            </div>
                        </div>
                        <div class="mt-4">
                            <label class="text-sm text-neutral-600">Problem Statement</label>
                            <p class="text-neutral-900 mt-1">
                                Material contamination detected in batch #123 during quality
                                inspection. Multiple units affected with visible foreign particles.
                            </p>
                        </div>
                    </div>

                    <!-- Investigation Form -->
                    <div class="bg-white border border-neutral-200 rounded-lg p-6">
                        <h3 class="text-lg text-neutral-900 mb-4">Investigation Details</h3>
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm text-neutral-700 mb-2"
                                    >Investigation Summary</label
                                >
                                <textarea
                                    class="w-full p-3 border border-neutral-300 rounded-md h-32"
                                    placeholder="Describe the investigation process and findings..."
                                ></textarea>
                            </div>
                            <div>
                                <label class="block text-sm text-neutral-700 mb-2"
                                    >Root Cause Analysis</label
                                >
                                <textarea
                                    class="w-full p-3 border border-neutral-300 rounded-md h-24"
                                    placeholder="Identify the root cause of this non-conformity..."
                                ></textarea>
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm text-neutral-700 mb-2"
                                        >Investigation Status</label
                                    >
                                    <select class="w-full p-3 border border-neutral-300 rounded-md">
                                        <option>In Progress</option>
                                        <option>Completed</option>
                                        <option>On Hold</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-sm text-neutral-700 mb-2"
                                        >Investigator</label
                                    >
                                    <select class="w-full p-3 border border-neutral-300 rounded-md">
                                        <option>Select Investigator</option>
                                        <option>John Doe</option>
                                        <option>Jane Smith</option>
                                        <option>Mike Johnson</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Evidence Section -->
                    <div class="bg-white border border-neutral-200 rounded-lg p-6">
                        <h3 class="text-lg text-neutral-900 mb-4">Investigation Evidence</h3>
                        <div class="space-y-4">
                            <div
                                class="border-2 border-dashed border-neutral-300 rounded-lg p-6 text-center"
                            >
                                <i
                                    class="fa-solid fa-cloud-upload-alt text-3xl text-neutral-400 mb-2"
                                ></i>
                                <p class="text-neutral-600 mb-2">
                                    Upload investigation evidence files
                                </p>
                                <button
                                    class="px-4 py-2 bg-neutral-900 text-white rounded-md text-sm"
                                >
                                    Choose Files
                                </button>
                            </div>
                            <div class="space-y-2">
                                <div
                                    class="flex items-center justify-between p-3 bg-neutral-50 rounded-md"
                                >
                                    <div class="flex items-center space-x-3">
                                        <i class="fa-solid fa-file-pdf text-neutral-600"></i>
                                        <span class="text-sm text-neutral-900"
                                            >contamination_photos.pdf</span
                                        >
                                    </div>
                                    <button class="text-neutral-600 hover:text-neutral-900">
                                        <i class="fa-solid fa-trash"></i>
                                    </button>
                                </div>
                                <div
                                    class="flex items-center justify-between p-3 bg-neutral-50 rounded-md"
                                >
                                    <div class="flex items-center space-x-3">
                                        <i class="fa-solid fa-file-alt text-neutral-600"></i>
                                        <span class="text-sm text-neutral-900"
                                            >inspection_report.docx</span
                                        >
                                    </div>
                                    <button class="text-neutral-600 hover:text-neutral-900">
                                        <i class="fa-solid fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Actions Panel -->
                <div id="actions-panel" class="space-y-6">
                    <!-- Investigation Decision -->
                    <div class="bg-white border border-neutral-200 rounded-lg p-6">
                        <h3 class="text-lg text-neutral-900 mb-4">Investigation Decision</h3>
                        <div class="space-y-4">
                            <div class="space-y-2">
                                <label class="flex items-center space-x-2">
                                    <input
                                        type="radio"
                                        name="decision"
                                        class="text-neutral-900"
                                    />
                                    <span class="text-sm text-neutral-700"
                                        >Initiate Corrective Action</span
                                    >
                                </label>
                                <label class="flex items-center space-x-2">
                                    <input type="radio" name="decision" class="text-neutral-900" />
                                    <span class="text-sm text-neutral-700"
                                        >Close NC (No Action Required)</span
                                    >
                                </label>
                            </div>
                            <div>
                                <label class="block text-sm text-neutral-700 mb-2"
                                    >Decision Rationale</label
                                >
                                <textarea
                                    class="w-full p-3 border border-neutral-300 rounded-md h-24"
                                    placeholder="Explain the reasoning for this decision..."
                                ></textarea>
                            </div>
                        </div>
                    </div>

                    <!-- Corrective Action Assignment -->
                    <div class="bg-white border border-neutral-200 rounded-lg p-6">
                        <h3 class="text-lg text-neutral-900 mb-4">Corrective Action</h3>
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm text-neutral-700 mb-2"
                                    >Action Description</label
                                >
                                <textarea
                                    class="w-full p-3 border border-neutral-300 rounded-md h-20"
                                    placeholder="Describe the corrective action to be taken..."
                                ></textarea>
                            </div>
                            <div>
                                <label class="block text-sm text-neutral-700 mb-2">Assign To</label>
                                <select class="w-full p-3 border border-neutral-300 rounded-md">
                                    <option>Select Assignee</option>
                                    <option>John Doe</option>
                                    <option>Jane Smith</option>
                                    <option>Mike Johnson</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm text-neutral-700 mb-2">Due Date</label>
                                <input
                                    type="date"
                                    class="w-full p-3 border border-neutral-300 rounded-md"
                                    value="2025-02-15"
                                />
                            </div>
                            <div class="flex items-center space-x-2">
                                <input type="checkbox" class="text-neutral-900" />
                                <span class="text-sm text-neutral-700">Notify assignee</span>
                            </div>
                        </div>
                    </div>

                    <!-- Immediate Actions -->
                    <div class="bg-white border border-neutral-200 rounded-lg p-6">
                        <h3 class="text-lg text-neutral-900 mb-4">Immediate Actions</h3>
                        <div class="space-y-3">
                            <div
                                class="flex items-center justify-between p-3 bg-neutral-50 rounded-md"
                            >
                                <div>
                                    <p class="text-sm text-neutral-900">Isolate affected batch</p>
                                    <p class="text-xs text-neutral-600">
                                        Assigned to: Mike Johnson
                                    </p>
                                </div>
                                <span
                                    class="inline-flex px-2 py-1 text-xs bg-neutral-100 text-neutral-800 rounded-full"
                                    >Completed</span
                                >
                            </div>
                            <div
                                class="flex items-center justify-between p-3 bg-neutral-50 rounded-md"
                            >
                                <div>
                                    <p class="text-sm text-neutral-900">Stop production line</p>
                                    <p class="text-xs text-neutral-600">
                                        Assigned to: Sarah Wilson
                                    </p>
                                </div>
                                <span
                                    class="inline-flex px-2 py-1 text-xs bg-neutral-100 text-neutral-800 rounded-full"
                                    >In Progress</span
                                >
                            </div>
                            <button
                                class="w-full px-4 py-2 border border-neutral-300 rounded-md text-neutral-700 hover:bg-neutral-50 text-sm"
                            >
                                <i class="fa-solid fa-plus mr-2"></i>
                                Add Immediate Action
                            </button>
                        </div>
                    </div>

                    <!-- RCA Tools -->
                    <div class="bg-white border border-neutral-200 rounded-lg p-6">
                        <h3 class="text-lg text-neutral-900 mb-4">Root Cause Analysis Tools</h3>
                        <div class="space-y-2">
                            <button
                                class="w-full px-4 py-2 border border-neutral-300 rounded-md text-neutral-700 hover:bg-neutral-50 text-sm text-left"
                            >
                                <i class="fa-solid fa-project-diagram mr-2"></i>
                                Fishbone Diagram
                            </button>
                            <button
                                class="w-full px-4 py-2 border border-neutral-300 rounded-md text-neutral-700 hover:bg-neutral-50 text-sm text-left"
                            >
                                <i class="fa-solid fa-sitemap mr-2"></i>
                                Cause and Effect
                            </button>
                            <button
                                class="w-full px-4 py-2 border border-neutral-300 rounded-md text-neutral-700 hover:bg-neutral-50 text-sm text-left"
                            >
                                <i class="fa-solid fa-question-circle mr-2"></i>
                                Five Whys
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Action Buttons -->
            <div id="action-buttons" class="mt-6 flex justify-end space-x-3">
                <button
                    class="px-6 py-2 border border-neutral-300 rounded-md text-neutral-700 hover:bg-neutral-50"
                >
                    Cancel
                </button>
                <button
                    class="px-6 py-2 border border-neutral-300 rounded-md text-neutral-700 hover:bg-neutral-50"
                >
                    Save Draft
                </button>
                <button class="px-6 py-2 bg-neutral-900 text-white rounded-md hover:bg-neutral-800">
                    Complete Investigation
                </button>
            </div>
        </main>
    </div>
</template>

<script setup lang="ts">
import BreadCrums from '../breadCrums.vue'

const crumbs = [
    { name: 'Non Conformities', path: '/act/non-conformities', icon: 'fa-solid fa-exclamation-triangle' },
    { name: 'View Non-Conformities', path: '/act/non-conformities/view', icon: 'fa-solid fa-eye' },
    { name: 'Add Investigation', path: '/act/non-conformities/add-investigation', icon: 'fa-solid fa-plus' }
]
</script>