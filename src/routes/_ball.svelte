<script context="module">
  export const prerender = true
</script>
<script lang="ts">
  import IntersectionObserver from "svelte-intersection-observer";
  import MediaQuery from "svelte-media-query";
  let element: HTMLElement;

  export let src: string;
  export let selected: boolean;
  export let onPress: () => void;
</script>

<MediaQuery query="(min-width: 768px)" let:matches>
  <IntersectionObserver
    {element}
    threshold={1}
    once={matches}
    on:intersect={() => {
      if (!matches) {
        onPress();
      }
    }}
  >
    <button
      on:click={onPress}
      on:focus={onPress}
      bind:this={element}
      class="h-48 w-48 ml-12 md:ml-12 flex-shrink-0 focus:outline-none rounded-full flex justify-center items-center bg-white m-3 overflow-hidden shadow-md p-8 z-10 {selected
        ? 'ring-4 transition-transform scale-110 shadow-lg opacity-70 md:opacity-100'
        : ''}"
    >
      <img alt="Noice" {src} />
    </button>
  </IntersectionObserver>
</MediaQuery>
