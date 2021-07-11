<script lang="ts">
  import IntersectionObserver from "svelte-intersection-observer";
  let element;
  let intersecting;

  export let src: string;
  export let selected: boolean;
  export let onPress: () => void;

</script>

<IntersectionObserver>
<button
  on:click={onPress}
  on:focus={onPress}
  bind:this={element}
  class="h-48 w-48 ml-12 md:ml-12 flex-shrink-0 focus:outline-none rounded-full flex justify-center items-center bg-white m-3 overflow-hidden shadow-md p-8 {selected
    ? 'ring-4 transition-transform scale-110'
    : ''}"
>
  <img alt="Noice" {src} />
</button>
  </IntersectionObserver>
