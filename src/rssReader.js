import axios from 'axios';
import { watch } from 'melanke-watchjs';
import i18next from 'i18next';
import _ from 'lodash'; // eslint-disable-line lodash-fp/use-fp
import resources from '../locales/descriptions';
import {
  validateUrl, parseRss, updatePosts, refreshFeeds,
} from './processors';
import { makePostsList, makeFeedItem, displayHidePosts } from './htmlMakers';

export default () => {
  i18next.init({
    debug: true,
    lng: 'descriptions',
    defaultNS: 'errors',
    resources,
  });

  const appState = {
    form: {
      state: 'onInput',
      urlState: 'empty',
      url: '',
      responseStatus: '',
    },
    feeds: {
      state: 'not-updating',
      activeFeedId: '',
      timerId: '',
      list: [],
    },
    posts: {
      fresh: [],
      all: {},
    },
  };

  const mainTitles = document.getElementById('mainTitles');
  const content = document.getElementById('content');
  const addRssForm = document.getElementById('addRss');
  const [addLinkBtn, inputField] = addRssForm.elements;
  const warningNode = document.getElementById('wrongInput');
  const loadingIndicator = document.getElementById('linkLoading');
  const feedsListTag = document.getElementById('rssFeeds');
  const newsTag = document.getElementById('news');
  const feedsBadges = {};
  const addedFeeds = {};
  const publishedPosts = new Map();

  const markActiveFeed = ({ currentTarget }) => {
    const { activeFeedId } = appState.feeds;
    const currentId = currentTarget.id;
    appState.feeds.activeFeedId = activeFeedId !== currentId ? currentId : `sameFeed-${currentId}`;
  };

  watch(appState.form, 'urlState', () => {
    const { urlState } = appState.form;
    inputField.className = 'form-control';
    switch (urlState) { // eslint-disable-line default-case
      case 'is-valid':
        inputField.classList.add(urlState);
        addLinkBtn.disabled = false;
        break;
      case 'is-invalid':
        inputField.classList.add(urlState);
        break;
    }
  });

  watch(appState.form, 'state', () => {
    const { state, responseStatus } = appState.form;
    inputField.disabled = false;
    warningNode.classList.add('d-none');
    addLinkBtn.disabled = true;
    addLinkBtn.classList.replace('align-self-end', 'align-self-start');
    [...loadingIndicator.children].forEach(({ classList }) => classList.add('d-none'));
    switch (state) { // eslint-disable-line default-case
      case 'processing':
        [...loadingIndicator.children].forEach(({ classList }) => classList.remove('d-none'));
        inputField.disabled = true;
        inputField.className = 'form-control';
        addLinkBtn.classList.replace('align-self-start', 'align-self-end');
        break;
      case 'processed':
        inputField.value = '';
        mainTitles.classList.remove('d-none');
        content.classList.remove('d-none');
        break;
      case 'failed':
        warningNode.innerText = i18next.t([`${responseStatus}`, 'unspecific']);
        warningNode.classList.remove('d-none');
        break;
    }
  });

  watch(appState.feeds, 'list', () => {
    makeFeedItem(appState.feeds.list, feedsListTag, markActiveFeed);
  });

  watch(appState.posts, 'fresh', () => {
    const { fresh, all } = appState.posts;
    const [activeFeedIdValue] = appState.feeds.activeFeedId.split('-');
    fresh.forEach((freshPosts) => {
      const [currentFeedId] = freshPosts;
      let currentFeedBadge = feedsBadges[currentFeedId];
      if (!currentFeedBadge) {
        currentFeedBadge = document.getElementById(`${currentFeedId}-badge`);
        feedsBadges[currentFeedId] = currentFeedBadge;
      }
      makePostsList(freshPosts, newsTag, activeFeedIdValue, publishedPosts);
      currentFeedBadge.innerText = all[currentFeedId].length;
    });
  });

  watch(appState.feeds, 'activeFeedId', () => {
    const { activeFeedId } = appState.feeds;
    const [activeIdValue, sameFeedId] = activeFeedId.split('-');
    displayHidePosts(activeIdValue, publishedPosts);
    if (activeIdValue === 'sameFeed') {
      const feedElem = _.find(addedFeeds, ({ id }) => id === sameFeedId);
      feedElem.classList.toggle('active');
      return;
    }
    let currentFeed = addedFeeds[activeIdValue];
    if (!currentFeed) {
      currentFeed = document.getElementById(activeIdValue);
      addedFeeds[activeIdValue] = currentFeed;
    }
    const prevActiveFeed = _.find(addedFeeds, ({ classList }) => classList.contains('active'));
    const feedsPair = prevActiveFeed ? [currentFeed, prevActiveFeed] : [currentFeed];
    feedsPair.forEach(({ classList }) => classList.toggle('active'));
  });


  inputField.addEventListener('input', ({ target }) => {
    const { form, feeds } = appState;
    const { value } = target;
    form.state = 'onInput';
    if (value.length === 0) {
      form.urlState = 'empty';
      return;
    }
    const isLinkValid = validateUrl(feeds.list, value);
    form.urlState = isLinkValid ? 'is-valid' : 'is-invalid';
    form.url = isLinkValid ? value : '';
  });

  addRssForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const { form, feeds, posts } = appState;
    form.state = 'processing';
    axios.get(`https://cors-anywhere.herokuapp.com/${form.url}`)
      .then(({ data }) => {
        const parsedData = parseRss(data);
        form.state = 'processed';
        form.urlState = 'empty';
        return parsedData;
      })
      .then(({ title, description, itemsList }) => {
        const sameFeed = feeds.list.find(feed => feed.title === title);
        if (sameFeed) {
          throw new Error(`SameFeed already exists:\n  id- ${sameFeed.feedId}\n  Title- ${sameFeed.title}`);
        }
        const feedId = `rssFeed${feeds.list.length + 1}`;
        const newFeed = {
          feedId, title, description, postsCount: itemsList.length, url: form.url,
        };
        feeds.list.push(newFeed);
        appState.posts.fresh = [updatePosts(itemsList, feedId, posts)];

        if (feeds.state === 'not-updating') {
          feeds.state = 'updating';
          const refresh = () => {
            feeds.timerId = setTimeout(() => {
              refreshFeeds(appState.feeds.list, appState);
              feeds.timerId = setTimeout(refresh, 30000);
            }, 30000);
          };
          refresh();
        }
      })
      .catch((err) => {
        form.urlState = 'is-invalid';
        form.state = 'failed';
        if (err.response) {
          form.responseStatus = err.response.status;
          throw new Error(err);
        }
        const [statusType] = err.message.split(' ');
        form.responseStatus = statusType;
        throw new Error(err);
      });
  });
};
