<script lang="ts">
  import Ball from "./_ball.svelte";
  let selectedBall = 0
</script>

<div class="h-screen w-screen md:container md:mx-auto flex items-center md:justify-center">
  <div class="flex flex-row md:justify-center overflow-y-hidden p-3">
    <Ball src="https://upload.wikimedia.org/wikipedia/commons/4/41/Uros-logo-plain.png" selected = {selectedBall === 0} onPress = {() => {selectedBall = 0}}/>
    <Ball src="https://idsihealth.org/wp-content/uploads/2015/01/University-of-Glasgow.jpg" selected = {selectedBall === 1} onPress = {() => {selectedBall = 1}}/>
    <Ball src="https://brokerchooser.com/uploads/broker_logos/barclays-review.png" selected = {selectedBall === 2}  onPress = {() => {selectedBall = 2}}/>
  </div>
</div>
