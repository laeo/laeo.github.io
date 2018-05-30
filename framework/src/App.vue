<template>
  <div id="app">
    <aside>
      <h1>{{ title }}<icon name="bars" @click.native="show = !show"></icon></h1>

      <transition name="fade">
        <div id="togglable" v-show="show">
          <router-link key="#/" :to="{name: 'Home'}">首页</router-link>
          <router-link v-for="(path, title) in posts" :key="path" :to="{'path': '/posts/'+path}">
            {{ title }}
          </router-link>
        </div>
      </transition>
    </aside>

    <main>
      <router-view></router-view>
    </main>

    <vue-progress-bar></vue-progress-bar>
  </div>
</template>

<script>
export default {
  data() {
    return {
      title: process.env.title,
      posts: {},
      show: window.outerWidth > 640,
    }
  },
  watch: {
    show(to) {
      if (to) {
        this.$router.beforeEach((to, from, next) => {
          this.show = false
          this.$router.beforeHooks.pop()
          next()
        })
      }
    }
  },
  beforeMount() {
    this.fetch('posts.json').then(res => this.posts = res)
  },
}
</script>