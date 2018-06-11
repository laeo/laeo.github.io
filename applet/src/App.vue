<template>
  <div id="app">
    <aside>
      <h1>{{ title }}<icon name="bars" @click.native="changeBookshelfState"></icon></h1>

      <transition name="fade">
        <div id="togglable" v-show="canShowBookshelf">
          <router-link key="home" :to="{name: 'Home'}" exact>首页</router-link>
          <router-link v-for="draft in sortedDrafts" :key="draft.title" :to="{'path': '/posts/'+draft.path}">
            {{ draft.title }}
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
      drafts: [],
      innerWidth: window.innerWidth,
      showBookshelf: true
    }
  },
  computed: {
    isDesktopDevice() {
      return this.innerWidth > 640;
    },
    canShowBookshelf() {
      return this.isDesktopDevice || this.showBookshelf;
    },
    sortedDrafts() {
      return this.drafts.sort((a, b) => {
        return a.id > b.id;
      });
    }
  },
  methods: {
    updateWindowSize() {
      this.innerWidth = window.innerWidth;
      this.changeBookshelfState();
    },
    changeBookshelfState() {
      if (this.isDesktopDevice) {
        this.showBookshelf = true;
      } else {
        this.showBookshelf = !this.showBookshelf;
      }
    }
  },
  beforeMount() {
    this.fetch('index.json').then(res => this.drafts = res);
    this.changeBookshelfState();
  },
  mounted() {
    window.addEventListener('resize', this.updateWindowSize);
  }
}
</script>