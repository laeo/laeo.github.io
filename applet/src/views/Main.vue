<template>
  <div ref="marked" class="markdown-body" v-html="rendered"></div>
</template>

<script>
  export default {
    data() {
      return {
        rendered: null
      }
    },
    beforeMount() {
      this.fetch(this.$route.params.path || 'default.md').then(md => {
        this.marked(md, dom => this.replace(dom))
      })
    },
    watch: {
      '$route' (to) {
        this.fetch(to.params.path || 'default.md').then(res => {
          this.marked(res, dom => this.replace(dom))
        })
      }
    },
    methods: {
      replace(dom) {
        this.rendered = dom
        this.$refs.marked.scrollIntoView({block: "start", behavior: "smooth"})
      },
    }
  }
</script>