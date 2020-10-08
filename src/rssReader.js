import { watch } from 'melanke-watchjs';
import i18next from 'i18next';
import $ from 'jquery';
import resources from '../locales/descriptions';
import {
  processTypedUrl, processFormData, makeSelection, changeFeed, removeData,
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
    proxy: 'cors-anywhere.herokuapp.com',
    dataState: 'waiting',
    addRss: {
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
      all: [],
      selected: [],
    },
    search: {
      inputState: 'empty',
      text: '',
    },
  };

  const content = document.getElementById('content');
  const addRssForm = document.getElementById('addRss');
  const [removeFeedBtn, addFeedBtn, urlInputField] = addRssForm.elements;
  const removingDataModal = document.getElementById('removingDataModal');
  const confirmRemovingBtn = document.getElementById('dataRemoving');
  const searchInput = document.getElementById('searchField');
  const warningNode = document.getElementById('processingErr');
  const feedsListTag = document.getElementById('rssFeedsList');
  const postsListTag = document.getElementById('postsList');
  const feedsBadges = {};

  watch(appState.addRss, 'urlState', () => {
    const { urlState } = appState.addRss;
    const [value, warning] = urlState.split(' ');
    urlInputField.className = 'form-control';
    addFeedBtn.disabled = true;
    addFeedBtn.classList.replace('btn-primary', 'btn-outline-primary');
    switch (value) { // eslint-disable-line default-case
      case 'is-valid':
        urlInputField.classList.add(value);
        addFeedBtn.classList.replace('btn-outline-primary', 'btn-primary');
        addFeedBtn.disabled = false;
        break;
      case 'is-invalid':
        urlInputField.classList.add(value);
        warningNode.innerText = i18next.t([`${warning}`, 'unspecific']);
        break;
    }
  });

  const { placeholder } = urlInputField;
  const loadingIndicator = document.getElementById('linkLoading');
  watch(appState.addRss, 'state', () => {
    const { state, responseStatus, url } = appState.addRss;
    urlInputField.disabled = false;
    addFeedBtn.disabled = true;
    [...loadingIndicator.children].forEach(({ classList }) => classList.add('d-none'));
    switch (state) { // eslint-disable-line default-case
      case 'processing':
        [...loadingIndicator.children].forEach(({ classList }) => classList.remove('d-none'));
        urlInputField.disabled = true;
        urlInputField.placeholder = '';
        urlInputField.value = '';
        urlInputField.className = 'form-control';
        addFeedBtn.classList.replace('btn-primary', 'btn-outline-primary');
        break;
      case 'processed':
        content.classList.remove('d-none');
        urlInputField.placeholder = placeholder;
        searchInput.disabled = false;
        break;
      case 'failed':
        urlInputField.value = url;
        warningNode.innerText = i18next.t([`${responseStatus}`, 'unspecific']);
        break;
    }
  });

  const markActive = ({ currentTarget }) => {
    const currentId = currentTarget.id;
    changeFeed(currentId, appState);
  };
  const feedsCountTag = document.getElementById('feedsBadge');

  watch(appState.feeds, 'list', () => {
    const { feeds } = appState;
    feedsCountTag.innerText = feeds.list.length;
    if (feeds.list.length < [...feedsListTag.children].length) {
      const countTagIdToRemove = `${feeds.activeFeedId}-badge`;
      delete feedsBadges[countTagIdToRemove];
      return;
    }
    makeFeedItem(feeds.list, feedsListTag, markActive);
  }, 1);

  watch(appState.feeds, 'activeFeedId', () => {
    removeFeedBtn.disabled = true;
    removeFeedBtn.classList.replace('btn-warning', 'btn-outline-warning');
    const feedElements = [...feedsListTag.children];
    if (appState.feeds.list.length < feedElements.length) {
      feedElements.forEach((feedElem) => {
        const item = appState.feeds.list.find(({ feedId }) => feedElem.id === feedId);
        if (!item) {
          feedsListTag.removeChild(feedElem);
        }
      });
      return;
    }
    const prevActiveFeed = feedElements.find(({ classList }) => classList.contains('active'));
    if (prevActiveFeed) {
      prevActiveFeed.classList.remove('active');
    }
    const { activeFeedId } = appState.feeds;
    if (!activeFeedId) {
      return;
    }
    const currentFeed = feedElements.find(({ id }) => id === activeFeedId);
    currentFeed.classList.add('active');
    removeFeedBtn.disabled = false;
    removeFeedBtn.classList.replace('btn-outline-warning', 'btn-warning');
  });

  const getElement = (coll, tagId) => {
    let htmlTag = coll[tagId];
    if (!htmlTag) {
      htmlTag = document.getElementById(tagId);
      coll[tagId] = htmlTag; // eslint-disable-line no-param-reassign
    }
    return htmlTag;
  };

  const postsCountTag = document.getElementById('postsBadge');

  watch(appState.posts, 'fresh', () => {
    const { fresh, all } = appState.posts;
    const { list, activeFeedId } = appState.feeds;
    const [currentFeedId] = fresh;

    if (!currentFeedId) {
      return;
    }
    const { postsCount } = list.find(({ feedId }) => feedId === currentFeedId);
    const currentFeedBadge = getElement(feedsBadges, `${currentFeedId}-badge`);
    const { inputState } = appState.search;
    const postsList = makePostsList(fresh, activeFeedId, inputState);
    postsListTag.prepend(...postsList);
    currentFeedBadge.innerText = postsCount;
    if (inputState === 'matched') {
      return;
    }
    if (activeFeedId === currentFeedId) {
      postsCountTag.innerText = postsCount;
      return;
    }
    if (!activeFeedId) {
      postsCountTag.innerText = all.length;
    }
  });

  watch(appState.posts, 'selected', () => {
    const { selected, all } = appState.posts;
    const publishedPosts = [...postsListTag.children];
    if (all.length < publishedPosts.length) {
      removeFeedBtn.disabled = true;
      removeFeedBtn.classList.replace('btn-warning', 'btn-outline-warning');
      publishedPosts.forEach((post) => {
        const postData = all.find(({ postId }) => postId === post.id);
        if (!postData) {
          postsListTag.removeChild(post);
        }
      });
    }
    const { search } = appState;
    const searchText = search.inputState === 'matched' ? search.text : '';
    displayHidePosts(selected, [...postsListTag.children], searchText);
    postsCountTag.innerText = selected.length === 0 ? all.length : selected.length;
  });

  watch(appState.search, 'inputState', () => {
    const { inputState } = appState.search;
    searchInput.className = 'form-control text-center';
    switch (inputState) { // eslint-disable-line default-case
      case 'matched':
        searchInput.classList.add('is-valid');
        break;
      case 'noMatches':
        searchInput.classList.add('is-invalid');
        break;
    }
  });

  urlInputField.addEventListener('input', ({ target }) => {
    const { value } = target;
    processTypedUrl(appState, value);
  });

  addRssForm.addEventListener('submit', (e) => {
    e.preventDefault();
    processFormData(appState)
      .catch((err) => {
        const { addRss } = appState;
        addRss.urlState = 'is-invalid';
        addRss.state = 'failed';
        if (err.response) {
          addRss.responseStatus = err.response.status;
          throw new Error(err);
        }
        const [statusType] = err.message.split(' ');
        addRss.responseStatus = statusType;
        throw new Error(err);
      });
  });

  searchInput.addEventListener('input', ({ target }) => {
    const { search, posts, feeds } = appState;
    search.inputState = 'typing';
    const { value } = target;
    const str = value.trim().length > 0 ? value.toLowerCase() : '';
    search.text = str;

    const [matchedPosts, searchState] = makeSelection(str, feeds.activeFeedId, posts.all);
    posts.selected = matchedPosts;
    search.inputState = searchState;
  });

  confirmRemovingBtn.addEventListener('click', () => {
    $(removingDataModal).modal('hide');
    removeData(appState);
  });
};
