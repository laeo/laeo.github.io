<template>
  <div id="article" class="markdown-body"></div>
</template>

<script>
  export default {
    beforeMount() {
      this.fetch(`default.md`)
    }
  }
</script>