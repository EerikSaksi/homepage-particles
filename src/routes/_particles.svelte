<script context="module">
  export const prerender = true
</script>
<script>
  import { onMount } from "svelte";

  let ParticlesComponent;

  onMount(() => {
    fetch("/particles/stat_buff.json")
      .then((response) => response.json())
      .then((json) => {
        particlesConfig = json;
      });
    import("svelte-particles").then((module) => {
      ParticlesComponent = module.default;
    });
  });
  let particlesConfig;
</script>
<svelte:component this={ParticlesComponent} id="tsparticles" options={particlesConfig} />
