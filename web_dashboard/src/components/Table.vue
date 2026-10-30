<template>
    <div class="h-full">
        <div class="mt-8">
            <div class="overflow-x-hidden h-full">
                <div
                    :class="`min-w-full py-2 align-middle px-1 ${skipPadding ? '' : 'sm:px-6 lg:px-8'} flex flex-col items-center min-h-[400px]`"
                >
                    <div
                        id="filters"
                        class="mb-6 w-full"
                        v-if="
                            !!extraSearch ||
                            !!slots['extra-search'] ||
                            ((rows.length > 0 || searchVal || searchLoading) && onSearch)
                        "
                    >
                        <div class="flex flex-col sm:flex-row gap-4">
                            <div
                                v-if="(rows.length > 0 || searchVal || searchLoading) && onSearch"
                                class="flex-1"
                            >
                                <div class="relative">
                                    <span v-if="!searchLoading">
                                        <component
                                            :is="
                                                h('i', {
                                                    class: 'fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400'
                                                })
                                            "
                                        />
                                    </span>

                                    <Spinner
                                        v-if="searchLoading"
                                        width="1"
                                        class="absolute left-3 top-1/2 -translate-y-1/2"
                                    />
                                    <AppInput
                                        @input="
                                            (e: any) => {
                                                onSearch?.(e.target.value)
                                                searchVal = e.target.value
                                            }
                                        "
                                        type="text"
                                        :placeholder="searchPlaceholder || 'Search users...'"
                                        :test-id="`${entityName.toLowerCase()}-search`"
                                    />
                                </div>
                            </div>
                            <div class="flex gap-3">
                                <component v-if="!!extraSearch" :is="extraSearch" />
                                <slot name="extra-search" />
                            </div>
                        </div>
                    </div>

                    <div
                        v-if="view == 'table'"
                        class="bg-white  overflow-x-auto w-full relative rounded-t-lg"
                        id="table-wrapper"
                    >
                        <table class="min-w-full w-max rounded-t-lg">
                            <thead class="bg-primary  lg:table-header-group hidden rounded-t-lg ">
                                <tr>
                                    <!-- Drag handle column when drag is enabled -->
                                    <th
                                        v-if="enableDragAndDrop && hasDragAndDropPermission"
                                        scope="col"
                                        class="px-6 py-2 text-start text-sm text-opposite w-12"
                                        test-id="order-header"
                                    >
                                        {{ t('common.Order') }}
                                    </th>
                                    <th
                                        v-for="col in cols"
                                        :key="col"
                                        scope="col"
                                        class="px-6 py-2 text-start text-sm text-opposite max-w-40 min-w-32"
                                        :test-id="`${col.toLowerCase()}-header`"
                                    >
                                        <div class="flex items-center gap-2">
                                            <button
                                                v-if="isColumnSortable(col)"
                                                type="button"
                                                class="flex items-center gap-2 hover:text-neutral-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-black rounded text-start"
                                                :aria-label="`Cycle sort for ${columnHeaderLabel(col)}`"
                                                @click.stop="toggleColumnSort(col)"
                                                :test-id="`${col.toLowerCase()}-sort-toggle`"
                                            >
                                                <span>{{ columnHeaderLabel(col) }}</span>
                                                <span v-if="getSortDirection(col) === null">
                                                    <i class="fa-solid fa-sort"></i>
                                                </span>
                                                <span v-else-if="getSortDirection(col) === 'asc'">
                                                    <i class="fa-solid fa-sort-up"></i>
                                                </span>
                                                <span v-else-if="getSortDirection(col) === 'desc'">
                                                    <i class="fa-solid fa-sort-down"></i>
                                                </span>
                                                <span class="sr-only">{{ getSortDescription(col) }}</span>
                                            </button>
                                            <span v-else>{{ columnHeaderLabel(col) }}</span>
                                        </div>
                                    </th>

                                    <th
                                        scope="col"
                                        class="px-6 py-2 text-start text-sm text-opposite "
                                        test-id="actions-header"
                                        v-if="hasVisibleActions"
                                    >
                                        {{ t('common.Actions') }}
                                    </th>
                                </tr>
                            </thead>

                            <tbody class="divide-y divide-black relative border-l border-r">
                                <tr
                                    class="hover:bg-neutral-50"
                                    v-for="(row, index) in rows"
                                    :key="row.id"
                                    id="table-body"
                                    :test-id="`${entityName.toLowerCase()}-row-${row.id}`"
                                    :class="{
                                        'opacity-50': enableDragAndDrop && hasDragAndDropPermission && draggedIndex === index,
                                        'border-blue-300 bg-blue-50': enableDragAndDrop && hasDragAndDropPermission && draggedIndex !== null && draggedIndex !== index
                                    }"
                                    :draggable="enableDragAndDrop && hasDragAndDropPermission"
                                    @dragstart="enableDragAndDrop && hasDragAndDropPermission ? handleDragStart(index, $event) : undefined"
                                    @dragover="enableDragAndDrop && hasDragAndDropPermission ? $event.preventDefault() : undefined"
                                    @drop="enableDragAndDrop && hasDragAndDropPermission ? handleDrop(index, $event) : undefined"
                                    @dragenter="enableDragAndDrop && hasDragAndDropPermission ? $event.preventDefault() : undefined"
                                    @dragleave="enableDragAndDrop && hasDragAndDropPermission ? $event.preventDefault() : undefined"
                                >
                                    <!-- Drag handle column when drag is enabled -->
                                    <td
                                        v-if="enableDragAndDrop && hasDragAndDropPermission"
                                        class="px-6 py-2 whitespace-nowrap w-12"
                                    >
                                        <div class="flex items-center justify-center">
                                            <button
                                                type="button"
                                                class="text-neutral-400 hover:text-neutral-600 cursor-move p-1 rounded hover:bg-neutral-100 transition-colors"
                                                @mousedown="hasDragAndDropPermission ? handleDragStart(index, $event) : undefined"
                                                title="Drag to reorder"
                                            >
                                                <i class="fa-solid fa-grip-vertical"></i>
                                            </button>
                                        </div>
                                    </td>
                                    <td
                                        v-for="col in cols"
                                        :key="col"
                                        class="px-6 py-2 2xl:text-sm text-xs max-w-40 min-w-32 text-start"
                                    >
                                        <template
                                            v-if="
                                                filteredRow(row)[col] != null &&
                                                typeof filteredRow(row)[col] != 'string' &&
                                                typeof filteredRow(row)[col] != 'number'
                                            "
                                        >
                                            <component :is="filteredRow(row)[col]" />
                                        </template>
                                        <template
                                            v-else-if="
                                                mapStatusStyle &&
                                                mapStatusStyle(filteredRow(row)[col] as string) &&
                                                col == 'Status'
                                            "
                                        >
                                            <span
                                                :class="[
                                                    `px-2 py-1 2xl:text-sm text-xs rounded-full `,
                                                    mapStatusStyle(filteredRow(row)[col] as string) ||
                                                        'bg-neutral-100 text-neutral-800'
                                                ]"
                                                :dir="isRtl ? 'rtl' : 'ltr'"
                                                test-id="content-status"
                                            >
                                                <bdi>{{ filteredRow(row)[col] }}</bdi>
                                            </span>
                                        </template>
                                        <div v-else class="overflow-auto break-words" :dir="isRtl ? 'rtl' : 'ltr'" style="max-height: 4.5rem; line-height: 1.5rem;">
                                            <bdi>{{ filteredRow(row)[col] }}</bdi>
                                        </div>
                                    </td>

                                    <td
                                        id="action_column"
                                        class="relative  px-6 py-2  h-full break-words break-all"
                                    >
                                        <Can :subject="subject" :actions="['read','read_own']">
                                            <span
                                                v-if="
                                                    !hideView ||
                                                    !hideView(row.id ? entities.find((e) => e.id == row.id) : entities[index])
                                                "
                                                :test-id="`${entityName.toLowerCase()}-view-${entities.find((e) => e.id == row.id)?.id}`"
                                                class="hover:text-primary/70 text-primary mr-4 cursor-pointer"
                                                @click="
                                                    () => {
                                                        router.push(
                                                            viewPath?.(row) ||
                                                                `${router.currentRoute.value.path.replace(/\/$/, '')}/${row.id}`
                                                        )
                                                    }
                                                "
                                            >
                                                <i class="fa-solid fa-eye"></i
                                                ><span class="sr-only">, {{ row.id }}</span></span
                                            >
                                        </Can>
                                        <Can :subject="subject" :actions="['update']">
                                            <span
                                                @click="
                                                    (e: any) => {
                                                        e.stopPropagation()
                                                        if (onEdit) {
                                                            // For unsaved entities (without id), use index to find the correct entity
                                                            const entity = row.id ? entities.find((e) => e.id == row.id) : entities[index]
                                                            onEdit(entity)
                                                        } else {
                                                            router.push(
                                                                editPath?.(row) ||
                                                                    `${router.currentRoute.value.path.replace(/\/$/, '')}/${row.id}/edit`
                                                            )
                                                        }
                                                    }
                                                "
                                                v-if="
                                                    !hideEdit ||
                                                    !hideEdit(row.id ? entities.find((e) => e.id == row.id) : entities[index])
                                                "
                                                class="text-primary hover:text-primary/70 cursor-pointer mr-4"
                                                :test-id="`${entityName.toLowerCase()}-edit-${row.id}`"
                                            >
                                                <i class="fa-solid fa-pen-to-square"></i
                                                ><span class="sr-only">, {{ row.id }}</span></span
                                            >
                                        </Can>
                                        <Can :subject="subject" :actions="['delete']">
                                            <span
                                                @click="
                                                    (e: any) => {
                                                        e.stopPropagation()
                                                        if (!!deleteComponent) {
                                                            dialog.openDialog(deleteComponent, {
                                                                entity: entities.find(
                                                                    (e) => e.id == row.id
                                                                ),
                                                                onSuccess: () => {
                                                                    // Adjust page if we just deleted the last item on the last page
                                                                    adjustPageOnDelete()
                                                                    props.onSuccess()
                                                                    onChangeDialog(false)
                                                                },
                                                                onCancel: () => {
                                                                    onChangeDialog(false)
                                                                }
                                                            })
                                                        } else if (handleDelete) {
                                                            // Adjust page before delegating delete
                                                            adjustPageOnDelete()
                                                            if(row.id){
                                                                handleDelete(
                                                                    entities.find((e) => e.id == row.id)
                                                                )
                                                            } else {
                                                                handleDelete(index)
                                                            }
                                                        }
                                                    }
                                                "
                                                v-if="
                                                    (!!deleteComponent || !!handleDelete) &&
                                                    (!hideDelete ||
                                                        !hideDelete(
                                                            row.id ? entities.find((e) => e.id == row.id) : entities[index]
                                                        ))
                                                "
                                                class="text-primary hover:text-primary/70 cursor-pointer"
                                                :test-id="`${entityName.toLowerCase()}-delete-${row.id}`"
                                            >
                                                <i class="fa-solid fa-trash"></i
                                                ><span class="sr-only">, {{ row.id }}</span></span
                                            >
                                        </Can>
                                        <span
                                            @click="
                                                (e: any) => {
                                                    e.stopPropagation()
                                                    // For unsaved entities (without id), use index to find the correct entity
                                                    const entity = row.id ? entities.find((e) => e.id == row.id) : entities[index]
                                                    extraFieldAction?.(entity)
                                                }
                                            "
                                            v-if="!!extraField"
                                            ><component
                                                :is="extraField"
                                                :row="row.id ? entities.find((e) => e.id == row.id) : entities[index]"
                                                :onSuccess="
                                                    () => {
                                                        props.onSuccess()
                                                    }
                                                "
                                                :extraFieldAction="extraFieldInnerAction"
                                        /></span>
                                        <!-- Slot support for extra-field -->
                                        <span v-if="$slots['extra-field']" class="h-full">
                                            <slot 
                                                name="extra-field" 
                                                :entity="row.id ? entities.find((e) => e.id == row.id) : entities[index]"
                                                :index="index"
                                                :row="row"
                                            />
                                        </span>
                                    </td>
                                </tr>
                                <tr
                                    v-for="(row, index) in rows"
                                    :key="row.id"
                                    id="hidden-body"
                                    class="flex flex-col curor-pointer w-full"
                                    :class="{
                                        'opacity-50': enableDragAndDrop && hasDragAndDropPermission && draggedIndex === index,
                                        'border-blue-300 bg-blue-50': enableDragAndDrop && hasDragAndDropPermission && draggedIndex !== null && draggedIndex !== index
                                    }"
                                    :draggable="enableDragAndDrop && hasDragAndDropPermission"
                                    @dragstart="enableDragAndDrop && hasDragAndDropPermission ? handleDragStart(index, $event) : undefined"
                                    @dragover="enableDragAndDrop && hasDragAndDropPermission ? $event.preventDefault() : undefined"
                                    @drop="enableDragAndDrop && hasDragAndDropPermission ? handleDrop(index, $event) : undefined"
                                    @dragenter="enableDragAndDrop && hasDragAndDropPermission ? $event.preventDefault() : undefined"
                                    @dragleave="enableDragAndDrop && hasDragAndDropPermission ? $event.preventDefault() : undefined"
                                >
                                    <td class="w-full block">
                                        <!-- Drag handle for mobile view when drag is enabled -->
                                        <div
                                            v-if="enableDragAndDrop && hasDragAndDropPermission"
                                            class="w-full break-words py-4 pl-4 pr-3 text-xs font-medium dark:text-gray-300 text-gray-900 flex flex-row justify-between cursor-pointer"
                                        >
                                            <span>Order:</span>
                                            <div class="flex items-center">
                                                <button
                                                    type="button"
                                                    class="text-neutral-400 hover:text-neutral-600 cursor-move p-1 rounded hover:bg-neutral-100 transition-colors"
                                                    @mousedown="hasDragAndDropPermission ? handleDragStart(index, $event) : undefined"
                                                    title="Drag to reorder"
                                                >
                                                    <i class="fa-solid fa-grip-vertical"></i>
                                                </button>
                                            </div>
                                        </div>
                                        <div
                                            v-for="col in cols"
                                            :key="col"
                                            class="w-full break-words py-4 ps-4 pe-3 text-xs font-medium dark:text-gray-300 text-gray-900 flex flex-row justify-between cursor-pointer"
                                        >
                                            <span>{{ columnHeaderLabel(col) }}:</span>
                                            <span
                                                v-if="
                                                    filteredRow(row)[col] != null &&
                                                    typeof filteredRow(row)[col] != 'string' &&
                                                    typeof filteredRow(row)[col] != 'number'
                                                "
                                            >
                                                <component :is="filteredRow(row)[col]" />
                                            </span>
                                            <span v-else class="text-end font-bold ps-4" :dir="isRtl ? 'rtl' : 'ltr'">
                                                <bdi>{{ filteredRow(row)[col] }}</bdi></span
                                            >
                                        </div>

                                        <Can :subject="subject" :actions="['read','read_own']">    
                                            <div
                                                v-if="
                                                    !hideView ||
                                                    !hideView(row.id ? entities.find((e) => e.id == row.id) : entities[index])
                                                "
                                                class="relative whitespace-nowrap py-4 pl-4 text-left text-xs font-medium pr-3"
                                                @click="
                                                    (e) => {
                                                        e.stopPropagation()
                                                        router.push(
                                                            viewPath?.(row) ||
                                                                `${router.currentRoute.value.path.replace(/\/$/, '')}/${row.id}`
                                                        )
                                                    }
                                                "
                                            >
                                                <span
                                                    :test-id="`${entityName.toLowerCase()}-view-${entities[index]?.id}`"
                                                    class="text-primary hover:text-primary/70 cursor-pointer"
                                                >
                                                    <i class="fa-solid fa-eye"></i>
                                                    <span class="sr-only">, {{ row.id }}</span>
                                                </span>
                                            </div>
                                        </Can>
                                        <Can :subject="subject" :actions="['update']">
                                            <div
                                                v-if="
                                                    !hideEdit ||
                                                    !hideEdit(row.id ? entities.find((e) => e.id == row.id) : entities[index])
                                                "
                                                class="relative whitespace-nowrap py-4 pl-4 text-left text-xs font-medium pr-3"
                                                @click="
                                                    (e) => {
                                                        e.stopPropagation()
                                                        if (onEdit) {
                                                            // For unsaved entities (without id), use index to find the correct entity
                                                            const entity = row.id ? entities.find((e) => e.id == row.id) : entities[index]
                                                            onEdit(entity)
                                                        } else {
                                                            router.push(
                                                                editPath?.(row) ||
                                                                    `${router.currentRoute.value.path.replace(/\/$/, '')}/${row.id}/edit`
                                                            )
                                                        }
                                                    }
                                                "
                                            >
                                                <span
                                                    :test-id="`${entityName.toLowerCase()}-edit-${entities[index]?.id}`"
                                                    class="text-primary hover:text-primary/70 cursor-pointer"
                                                >
                                                    <i class="fa-solid fa-pen-to-square"></i>
                                                    <span class="sr-only">, {{ row.id }}</span>
                                                </span>
                                            </div>
                                        </Can>
                                        <Can :subject="subject" :actions="['delete']">
                                            <div
                                                class="relative whitespace-nowrap pl-4 text-left text-xs font-medium pr-3"
                                                v-if="
                                                    (!!deleteComponent || !!handleDelete) &&
                                                    (!hideDelete || !hideDelete(row.id ? entities.find((e) => e.id == row.id) : entities[index]))
                                                "
                                                @click="
                                                    (e: any) => {
                                                        e.stopPropagation()
                                                        if (handleDelete) {
                                                            // Adjust page before delegating delete
                                                            adjustPageOnDelete()
                                                            if(row.id){
                                                                handleDelete(
                                                                    entities.find((e) => e.id == row.id)
                                                                )
                                                            } else {
                                                                handleDelete(index)
                                                            }
                                                        } else {
                                                            // For unsaved entities (without id), use index to find the correct entity
                                                            const entity = row.id ? entities.find((e) => e.id == row.id) : entities[index]
                                                            dialog.openDialog(
                                                                deleteComponent as Component,
                                                                {
                                                                    entity: entity,
                                                                    onSuccess: () => {
                                                                        // Adjust page if we just deleted the last item on the last page
                                                                        adjustPageOnDelete()
                                                                        props.onSuccess()
                                                                    },
                                                                    onCancel: () => {
                                                                        onChangeDialog(false)
                                                                    }
                                                                }
                                                            )
                                                        }
                                                    }
                                                "
                                            >
                                                <span
                                                    class="relative whitespace-nowrap py-4 pl-4 text-left text-xs font-medium pr-3"
                                                    ><TrashIcon class="text-red-700 w-4" /><span
                                                        class="sr-only"
                                                        >, {{ row.id }}</span
                                                    ></span
                                                >
                                            </div>
                                        </Can>
                                        <div
                                            v-if="!!extraField"
                                            class="break-words py-4 pl-4 pr-3 text-xs font-medium dark:text-gray-300 text-gray-900 flex flex-row justify-between cursor-pointer"
                                            @click="
                                                (e: any) => {
                                                    e.stopPropagation()
                                                    // For unsaved entities (without id), use index to find the correct entity
                                                    const entity = row.id ? entities.find((e) => e.id == row.id) : entities[index]
                                                    extraFieldAction?.(entity)
                                                }
                                            "
                                        >
                                            <component
                                                :is="extraField"
                                                :row="row.id ? entities.find((e) => e.id == row.id) : entities[index]"
                                                :onSuccess="
                                                    () => {
                                                        props.onSuccess()
                                                    }
                                                "
                                                :extraFieldAction="extraFieldInnerAction"
                                            />
                                        </div>
                                        <!-- Slot support for extra-field in mobile view -->
                                        <div v-if="slots['extra-field']" class="break-words py-4 pl-4 pr-3 text-xs font-medium dark:text-gray-300 text-gray-900 flex flex-row justify-between">
                                            <slot 
                                                name="extra-field" 
                                                :entity="row.id ? entities.find((e) => e.id == row.id) : entities[index]"
                                                :index="index"
                                                :row="row"
                                            />
                                        </div>
                                    </td>
                                </tr>
                                <div
                                    v-if="loading && !searchLoading && !searchVal"
                                    class="inset-0 bg-white bg-opacity-75 flex items-center justify-center w-full h-24"
                                >
                                    <div
                                        class="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center w-full"
                                    >
                                        <Spinner />
                                    </div>
                                </div>
                            </tbody>
                        </table>
                    </div>
                    <div
                        class="px-6 py-3  w-full  rounded-b-lg border-b border-l border-r"
                        v-if="rows.length > 0"
                    >
                        <div
                            class="flex items-center justify-between w-full"
                            
                        >
                            <div class=" flex-row w-full items-center justify-between grid grid-cols-12">
                                <div class="text-sm text-neutral-600 col-span-2" test-id="pagination-info">
                                    {{
                                        t('table.pagination_info', {
                                            start: formatPaginationNumber((page - 1) * perPage + 1),
                                            end: formatPaginationNumber(
                                                page == totalPages ? total : page * perPage
                                            ),
                                            total: formatPaginationNumber(total)
                                        })
                                    }}
                                </div>
                                <div class="flex gap-2 col-span-10 flex-wrap justify-end" v-if="totalPages > 1">
                                    <button
                                        class="px-3 py-1 border rounded hover:bg-neutral-50 disabled:opacity-50"
                                        :disabled="page == 1"
                                        @click="() => onPreviousPage()"
                                        test-id="previous-page-button"
                                    >
                                        {{ t('table.pagination_previous') }}
                                    </button>
                                    <button
                                        v-if="pageLoading"
                                        class="px-3 py-1 border rounded hover:bg-neutral-50 disabled:opacity-50"
                                    >
                                        <Spinner  />
                                    </button>

                                    <!-- Current: "z-10 bg-indigo-600 dark:text-white text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600", Default: "dark:text-gray-900 text-gray-100 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0" -->
                                    <template v-for="item in visiblePages" :key="`p-${item}`">
                                        <span
                                            v-if="item === '...'"
                                            class="px-3 py-1 text-neutral-500 select-none"
                                        >
                                            ...
                                        </span>
                                        <button
                                            v-else
                                            class=""
                                            @click="() => setPage(item as number)"
                                            aria-current="page"
                                            :class="` px-3 py-1 border rounded ${
                                                page == (item as number)
                                                    ? 'bg-neutral-800 text-white'
                                                    : 'bg-neutral-200 text-neutral-800'
                                            } `"
                                        >
                                            {{ formatPaginationNumber(item as number) }}
                                        </button>
                                    </template>

                                    <button
                                        @click="() => onNextPage()"
                                        class="px-3 py-1 border rounded hover:bg-neutral-50 disabled:opacity-50"
                                        :disabled="page == totalPages"
                                        test-id="next-page-button"
                                    >
                                        {{ t('table.pagination_next') }}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div
                        v-if="rows.length == 0 && !loading"
                        class="dark:text-white text-black p-4 text-xl"
                        test-id="no-records-message"
                    >
                        {{ t('common.no_records_found_for', { entity: entityName }) }}
                    </div>
                    <div v-if="view == 'add'" class="text-left w-full">
                        <div class="flex" aria-label="Breadcrumb">
                            <ol role="list" class="flex items-center space-x-4">
                                <li>
                                    <div class="flex items-center">
                                        <a
                                            @click="() => setView('table')"
                                            class="ml-4 text-sm font-medium text-gray-500 hover:text-gray-600 cursor-pointer"
                                            >View All</a
                                        >
                                    </div>
                                </li>
                                <li>
                                    <div class="flex items-center">
                                        <ChevronRightIcon
                                            class="h-5 w-5 flex-shrink-0 text-gray-400"
                                            aria-hidden="true"
                                        />
                                        <a
                                            class="ml-4 text-sm font-medium dark:text-gray-300 text-gray-900 hover:text-gray-400 cursor-pointer"
                                            >Add {{ entityName }}</a
                                        >
                                    </div>
                                </li>
                            </ol>
                        </div>
                    </div>
                    <div v-if="view == 'edit'" class="text-left w-full">
                        <div class="flex" aria-label="Breadcrumb">
                            <ol role="list" class="flex items-center space-x-4">
                                <li>
                                    <div class="flex items-center">
                                        <a
                                            @click="() => setView('table')"
                                            class="ml-4 text-sm font-medium text-gray-500 hover:text-gray-600 cursor-pointer"
                                            >View All</a
                                        >
                                    </div>
                                </li>
                                <li>
                                    <div class="flex items-center">
                                        <ChevronRightIcon
                                            class="h-5 w-5 flex-shrink-0 text-gray-400"
                                            aria-hidden="true"
                                        />
                                        <a
                                            class="ml-4 text-sm font-medium dark:text-gray-300 text-gray-900 hover:text-gray-400 cursor-pointer"
                                            >Edit {{ entityName }}</a
                                        >
                                    </div>
                                </li>
                            </ol>
                        </div>
                    </div>
                    <div v-if="view == 'view'" class="text-left w-full">
                        <div class="flex" aria-label="Breadcrumb">
                            <ol role="list" class="flex items-center space-x-4">
                                <li>
                                    <div class="flex items-center">
                                        <a
                                            @click="() => setView('table')"
                                            class="ml-4 text-sm font-medium text-gray-500 hover:text-gray-600 cursor-pointer"
                                            >View All</a
                                        >
                                    </div>
                                </li>
                                <li>
                                    <div class="flex items-center">
                                        <ChevronRightIcon
                                            class="h-5 w-5 flex-shrink-0 text-gray-400"
                                            aria-hidden="true"
                                        />
                                        <a
                                            class="ml-4 text-sm font-medium dark:text-gray-300 text-gray-900 hover:text-gray-400 cursor-pointer"
                                            >View {{ entityName }}</a
                                        >
                                    </div>
                                </li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
const props = defineProps<{
    cols: string[]
    /** When set, shown in headers instead of raw col keys (cols must stay as row object keys). */
    columnLabels?: Record<string, string>
    rows: any[]
    entities: any[]
    page: number
    total: number
    perPage: number
    totalPages: number
    onNextPage: () => void
    onPreviousPage: () => void
    setPage: (page: number) => void
    onSuccess: () => void
    loading?: boolean
    searchLoading?: boolean
    pageLoading?: boolean
    hideEdit?: (entity: any) => boolean
    hideDelete?: (entity: any) => boolean
    hideView?: (entity: any) => boolean
    onEdit?: (row: any) => void
    onSearch?: (value: string) => void
    searchPlaceholder?: string
    deleteComponent?: Component
    extraField?: Component
    extraFieldAction?: (row: any) => void
    extraSearch?: Component
    subject?: string
    editPath?: (entity: any) => string
    entityName: string
    mapStatusStyle?: (status: string) => string
    viewPath?: (entity: any) => string
    skipPadding?: boolean
    handleDelete?: (entity: any) => void
    extraFieldInnerAction?: (row: any) => void
    // New props for drag and drop functionality
    enableDragAndDrop?: boolean
    onOrderChange?: (reorderedEntities: any[]) => void
    // Optional sort callback
    onSort?: (colName: string, direction: 'asc' | 'desc' | null) => void | Promise<void>
    sortedColumns?: string[]
}>()

import { ChevronRightIcon, TrashIcon } from '@heroicons/vue/20/solid'
import { h, onMounted, ref, computed, type Component, useSlots, nextTick } from 'vue'
import { useDialog } from '@/stores/dialog'
import type { TableEntity } from '@/util/interfaces'
import Spinner from './Spinner.vue'
import { useRouter } from 'vue-router'
import Can from './Can.vue'
import AppInput from './AppInput.vue'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from 'vue-i18n'
import { isLocaleRtl } from '@/util/util'

const { t, locale } = useI18n()

const isRtl = computed(() => isLocaleRtl(locale.value))
const authStore = useAuthStore()

const columnHeaderLabel = (col: string) => props.columnLabels?.[col] ?? col

function formatPaginationNumber(value: number): string {

    const loc = locale.value?.toLowerCase().startsWith('ar') ? 'ar' : 'en'
    try {
        return new Intl.NumberFormat(loc).format(value)
    } catch {
        return String(value)
    }
}
const router = useRouter()
const dialog = useDialog()
const slots = useSlots()
const view = ref('table')
const setView = (newView: string) => {
    view.value = newView
}
const selected = ref()
const isOpen = ref(false)
const onChangeDialog = (val: boolean) => {
    isOpen.value = val
}
const searchVal = ref('')

const columnSortStates = ref<Record<string, 'asc' | 'desc' | null>>({})

const setSort = async (col: string, dir: 'asc' | 'desc' | null) => {
    const colName = typeof col === 'string' ? col : ''
    if (!colName) return
    const nextState: Record<string, 'asc' | 'desc' | null> = { ...columnSortStates.value }
    Object.keys(nextState).forEach((key) => {
        if (key !== colName) {
            nextState[key] = null
        }
    })
    nextState[colName] = dir
    columnSortStates.value = nextState
    await props.onSort?.(colName, dir)
}

const isColumnSortable = (col: string): boolean => {
    if (!props.onSort) return false
    const list = props.sortedColumns
    if (!list || list.length === 0) return true
    return list.includes(col)
}

const getSortDirection = (col: string): 'asc' | 'desc' | null => {
    return columnSortStates.value[col] ?? null
}

const toggleColumnSort = async (col: string) => {
    if (!isColumnSortable(col)) return
    const current = getSortDirection(col)
    const next = current === null ? 'asc' : current === 'asc' ? 'desc' : null
    await setSort(col, next)
}

const getSortIcon = (col: string): string => {
    const direction = getSortDirection(col)
    if (direction === 'asc') return 'fa-sort-up'
    if (direction === 'desc') return 'fa-sort-down'
    return 'fa-sort'
}

const getSortDescription = (col: string): string => {
    const direction = getSortDirection(col)
    if (direction === 'asc') return 'Sorted ascending'
    if (direction === 'desc') return 'Sorted descending'
    return 'Not sorted'
}

// Drag and drop state
const draggedIndex = ref<number | null>(null)

// Drag and drop functionality
const handleDragStart = (index: number, event: DragEvent | MouseEvent) => {
    draggedIndex.value = index
    if ('dataTransfer' in event && event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('text/html', index.toString())
    }
}

const handleDrop = async (index: number, event: DragEvent) => {
    event.preventDefault()
    const draggedIndexValue = draggedIndex.value
    
    if (draggedIndexValue !== null && draggedIndexValue !== index) {
        try {
            // Create a new array to avoid direct mutation
            const newEntities = [...props.entities]
            
            // Store the target item
            const targetItem = { ...newEntities[index] }
            
            // Swap the items
            newEntities[index] = { ...newEntities[draggedIndexValue] }
            newEntities[draggedIndexValue] = targetItem
            
            // Update order numbers if entities have order property
            newEntities.forEach((item, idx) => {
                if ('order' in item) {
                    item.order = idx + 1
                }
            })
            
            // Wait for next tick to ensure DOM is ready
            await nextTick()
            
            // Notify parent component about the order change
            props.onOrderChange?.(newEntities)
        } catch (error) {
            console.error('Error during drag and drop:', error)
        }
    }
    
    draggedIndex.value = null
}

const hasDragAndDropPermission = computed(() => {
    return !props.subject || authStore.hasPermissions({
        subject: props.subject || '',
        actions: ['update', 'create']
    })
})
const visiblePages = computed<(number | '...')[]>(() => {
    const totalPages = props.totalPages || 0
    const current = props.page || 1
    const maxWindow = 6

    if (totalPages <= maxWindow + 2) {
        return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    const pages: Array<number | '...'> = []
    pages.push(1)

    let start = Math.max(2, current - Math.floor(maxWindow / 2))
    let end = start + maxWindow - 1
    const lastInner = totalPages - 1

    if (end > lastInner) {
        end = lastInner
        start = Math.max(2, end - maxWindow + 1)
    }

    if (start > 2) pages.push('...')

    for (let p = start; p <= end; p++) pages.push(p)

    if (end < lastInner) pages.push('...')

    pages.push(totalPages)
    return pages
})

const hasVisibleActions = computed(() => {
    return props.rows.some((row) => {
        const entity = props.entities.find((e) => e.id == row.id)
        return (
            ((!props.hideView || !props.hideView?.(entity)) &&
                (!props.subject ||
                    authStore.hasPermissions({
                        subject: props.subject || '',
                        actions: ['read','read_own']
                    }))) ||
            ((!props.hideEdit || !props.hideEdit?.(entity)) &&
                (!props.subject ||
                    authStore.hasPermissions({
                        subject: props.subject || '',
                        actions: ['update']
                    }))) ||
            ((props.deleteComponent || props.handleDelete) &&
                (!props.hideDelete || !props.hideDelete?.(entity)) &&
                (!props.subject ||
                    authStore.hasPermissions({
                        subject: props.subject || '',
                        actions: ['delete']
                    }))) ||
            !!props.extraField ||
            !!slots['extra-field']
        )
    })
})

const filteredRow = (row: { [key: string]: any }) => {
    let newRow = { ...row }
    for (const key of Object.keys(row)) {
        if (!props.cols.includes(key)) {
            delete newRow[key]
        }
    }
    return newRow
}

// Adjust pagination when deleting the last item on the last page
const adjustPageOnDelete = () => {
    const currentPageBeforeDelete = props.page
    const totalItemsBeforeDelete = props.total
    const perPage = props.perPage
    const totalPages = props.totalPages

    if (
        currentPageBeforeDelete > 1 &&
        currentPageBeforeDelete === totalPages &&
        totalItemsBeforeDelete % perPage === 1
    ) {
        props.setPage(currentPageBeforeDelete - 1)
    }
}
</script>
<style scoped>
#hidden-body {
    display: none;
}
@media (max-width: 1024px) {
    #table-head {
        display: none;
    }
    #table-body {
        display: none;
        background-color: transparent !important;
    }
    #hidden-body {
        display: block;
    }
    .body-small {
        display: block;
    }
}
</style>
