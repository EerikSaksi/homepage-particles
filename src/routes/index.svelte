<script context="module">
  export const prerender = true
</script>
<script lang="ts">
  import Ball from "./_ball.svelte";
  import Particles from "./_particles.svelte";
  let selectedBall = 3;
</script>

<Particles />
<div class="h-screen w-screen md:container md:mx-auto flex items-center md:items-start md:justify-center z-50">
  <div class="flex flex-row md:justify-center  p-3 md:mt-48 overflow-y-hidden">
    <Ball
      src="icon.png"
      selected={selectedBall === 3}
      onPress={() => {
        selectedBall = 3;
      }}
    />
    <Ball
      src="https://idsihealth.org/wp-content/uploads/2015/01/University-of-Glasgow.jpg"
      selected={selectedBall === 0}
      onPress={() => {
        selectedBall = 0;
      }}
    />
    <Ball
      src="https://upload.wikimedia.org/wikipedia/commons/4/41/Uros-logo-plain.png"
      selected={selectedBall === 1}
      onPress={() => {
        selectedBall = 1;
      }}
    />
    <Ball
      src="https://brokerchooser.com/uploads/broker_logos/barclays-review.png"
      selected={selectedBall === 2}
      onPress={() => {
        selectedBall = 2;
      }}
    />
  </div>
</div>
