<template>
  <div id="app">
    <aside>

      <h1>{{ title }}<icon name="bars" @click.native="show = !show"></icon></h1>

      <transition name="fade">
        <div id="togglable" v-show="show">
          <router-link key="#/" :to="{name: 'Home'}">首页</router-link>
          <router-link v-for="(uri, title) in articles" :key="uri" :to="{name: 'Reader', params: {uri}}">
            {{ title }}
          </router-link>
        </div>
      </transition>

    </aside>

    <main>
      <router-view></router-view>
    </main>
  </div>
</template>

<script>
export default {

  data() {
    return {
      title: process.env.title,
      articles: {},
      show: window.outerWidth > 640,
    }
  },

  watch: {
    show(to) {
      if (to) {
        this.$router.beforeEach((to,from,next) => {
          this.show = false
          this.$router.beforeHooks.pop()
          next()
        })
      }
    }
  },

  beforeMount() {
    fetch(`${process.env.MAPI}/sources.json`)
    .then(res => {
      if (res.ok) {
        return res.json()
      }

      throw new Error(res.statusText)
    })
    .then(ret => this.articles = ret)
    .catch(e => alert(e))
  },
}
</script>