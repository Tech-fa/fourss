import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useNotificationCountStore = defineStore('notificationCount', () => {
  const count = ref(+ (localStorage.getItem('notificationCount') || 0));

  function setCount(newCount: number) {
    count.value = newCount;
    localStorage.setItem('notificationCount', newCount.toString());
  }

  function increment() {
    count.value++;
  }

  function decrement() {
    count.value = Math.max(0, count.value - 1);
  }

  function reset() {
    count.value = 0;
  }

  return {
    count,
    setCount,
    increment,
    decrement,
    reset
  };
});

