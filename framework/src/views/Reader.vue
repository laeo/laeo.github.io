<template>
  <div id="article" class="markdown-body"></div>
</template>

<script>
  export default {

    beforeMount() {
      this.fetch(this.$router.currentRoute.params.uri)
    },

    watch: {
      '$route' (to) {
        this.fetch(to.params.uri)
      }
    }

  }

</script>