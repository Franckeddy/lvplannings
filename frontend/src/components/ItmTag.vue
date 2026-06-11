<template>
  <div class="itm-tag" v-tooltip.top="tooltipText">
    <span class="itm-tag-name">{{ name }}</span>
    <span class="itm-tag-winnings">+${{ winnings.toLocaleString() }}</span>
    <span class="itm-tag-flame" aria-hidden="true">
      🔥<span v-if="count > 1" class="itm-tag-count">×{{ count }}</span>
    </span>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  name: { type: String, required: true },
  winnings: { type: Number, required: true },
  count: { type: Number, default: 1 }
});

const tooltipText = computed(() => {
  const base = `${props.name} — ITM $${props.winnings.toLocaleString()}`;
  return props.count > 1 ? `${base} (${props.count} tournois)` : base;
});
</script>

<style scoped>
.itm-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 4px 4px 8px;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.22), rgba(234, 88, 12, 0.18));
  border: 1px solid rgba(245, 158, 11, 0.55);
  border-radius: 999px;
  box-shadow: 0 2px 10px rgba(245, 158, 11, 0.25);
  color: #fde68a;
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.itm-tag:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(245, 158, 11, 0.4);
}

.itm-tag-flame {
  order: -1;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 0.95rem;
  line-height: 1;
  filter: drop-shadow(0 0 4px rgba(251, 146, 60, 0.75));
  animation: itmTagFlicker 1.8s ease-in-out infinite;
}

.itm-tag-count {
  font-size: 0.62rem;
  font-weight: 800;
  color: #fef3c7;
  letter-spacing: -0.02em;
  filter: none;
}

@keyframes itmTagFlicker {
  0%, 100% { transform: scale(1) rotate(-2deg); opacity: 1; }
  50% { transform: scale(1.1) rotate(2deg); opacity: 0.92; }
}

.itm-tag-name {
  color: #fde68a;
  font-weight: 700;
  max-width: 110px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.itm-tag-winnings {
  order: 2;
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  background: linear-gradient(135deg, #16a34a, #22c55e);
  color: #ffffff;
  font-size: 0.7rem;
  font-weight: 800;
  border-radius: 999px;
  box-shadow: 0 2px 6px rgba(34, 197, 94, 0.35);
  letter-spacing: 0.01em;
}

@media (max-width: 480px) {
  .itm-tag {
    gap: 5px;
    padding: 3px 3px 3px 7px;
    font-size: 0.7rem;
  }
  .itm-tag-flame { font-size: 0.85rem; }
  .itm-tag-name { max-width: 80px; }
  .itm-tag-winnings { padding: 2px 6px; font-size: 0.65rem; }
}
</style>
