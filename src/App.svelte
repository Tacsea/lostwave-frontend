<script lang="ts">
  import { writable, get, derived  } from 'svelte/store';
  import { onMount, onDestroy } from 'svelte';

  import {
    includeLostwave,
    includeCoverage,
    includeMentions,
    includeOtherSites,
    includeFound,
    includeLost,
    includeHidden,
    excludeHoaxes,
    Percentage,
  } from './store.js';

  // Define the type of the entry object
  interface Entry {
    name: string;
    description: string;
    thumbnail_link: string;
    main_youtube_link: string;
    total_views: number;
    coverage_views: number;
    mention_views: number;
    daily_views: number;
    weekly_views: number;
    monthly_views: number;
    manual_other: number;
    as_seen_lw: string;
    status: string;
    rank: number;
    displayedViews: number;
    choice: string;
    is_hide: string;
    is_hoax: string;
    language: string;
    country_of_origin: string;
    generation: string;
  }

  const timely = ['all-time', 'daily', 'weekly', 'monthly'];
  const currentTimely = writable("all-time");

  const userColorMap = {
    'NOT': 'black',
    'HIGHLIGHT': '#99710C',
    'PLACEHOLDER2': '#055B2E',
    'PLACEHOLDER3': '#2A055B',
    'PLACEHOLDER4': '#5B0530',
    'PLACEHOLDER5': '#023649',
    'PLACEHOLDER6': '#0C4902',
    'PLACEHOLDER7': '#4A358A',
    'PLACEHOLDER8': '#66AD90',
    'PLACEHOLDER9': '#060270',
    'PLACEHOLDER10': '#FE9900',
    '1stPlace': '#996600',
    '2ndPlace': '#737373',
    '3rdPlace': '#802b00',
    'NEW': 'black',
  };

  // Create a writable store for the leaderboard data
  export const leaderboard = writable<Entry[]>([]);

  const myusername = import.meta.env.VITE_USERNAME;
  const mypassword = import.meta.env.VITE_PASSWORD;
  const prod_url_login = 'https://lostwavecharts.com/login'
  const local_url_login = 'http://localhost:5000/login'
  const prod_url = 'https://lostwavecharts.com/entries'
  const local_url = 'http://localhost:5000/entries'

  // Fetch leaderboard data from the API
  async function fetchLeaderboard() {
    try {

      // Perform login first
      const loginResponse = await fetch(prod_url_login, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: myusername,
          password: mypassword,
        }),
      });

      if (!loginResponse.ok) {
        throw new Error('Failed to login');
      }

      const loginData = await loginResponse.json();
      const token = loginData.token;

      localStorage.setItem('token', token);

      const entriesResponse = await fetch(prod_url, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + token, // Include the token in the Authorization header
          'Content-Type': 'application/json',
        },
      });

      if (!entriesResponse.ok) {
        throw new Error('Failed to fetch data');
      }
      const data = await entriesResponse.json();

      // Get the state of each checkbox
      const includeLostwaveValue = get(includeLostwave);
      const includeCoverageValue = get(includeCoverage);
      const includeMentionsValue = get(includeMentions);
      const includeOtherSitesValue = get(includeOtherSites);
      const includeFoundValue = get(includeFound);
      const includeLostValue = get(includeLost);
      const includeHiddenValue = get(includeHidden);
      const excludeHoaxesValue = get(excludeHoaxes);
      const currentTimelyValue = get(currentTimely);
      const PercentageValue = get(Percentage);

      // Filter out entries based on checkbox states
      let filteredData = data.filter((entry: Entry) => {
        let isFiltered = true;

        if (includeLostwaveValue && entry.as_seen_lw === 'UNSEEN') {
          isFiltered = false;
        }

        if (includeFoundValue && entry.status !== 'FOUND') {
          isFiltered = false;
        }

        if (includeLostValue && entry.status !== 'LOST') {
          isFiltered = false;
        }

        if (!includeHiddenValue && entry.is_hide) {
          isFiltered = false;
        }

        if (excludeHoaxesValue && entry.is_hoax) {
          isFiltered = false;
        }

        return isFiltered;
      });

      // Calculate displayed views
      filteredData = filteredData.map((entry: Entry) => ({
        ...entry,
        cardColor: userColorMap[entry.choice] || 'black',
        displayedViews: calculateDisplayedViews(entry, includeCoverageValue, includeMentionsValue, includeOtherSitesValue, currentTimelyValue, PercentageValue )
      }));

      // Sort filtered entries by displayedViews in descending order
      filteredData.sort((a: Entry, b: Entry) => b.displayedViews - a.displayedViews);

      // Assign rank based on the sorted order
      filteredData.forEach((entry: Entry, index: number) => {
        'entry.rank = filteredData.length - index;'
        entry.rank = index + 1;
      });

      // Update the leaderboard store with the calculated data
      leaderboard.set(filteredData);
    } catch (error) {
      console.error('Error fetching data:', error);
      leaderboard.set([]); // Set an empty array in case of error
    }
  }

    function calculateDisplayedViews(
    entry: Entry,
    includeCoverage: boolean,
    includeMentions: boolean,
    includeOtherSites: boolean,
    currentTimely: string,
    Percentage: boolean,
  ): number {
    let displayedViews = 0;

    if (currentTimely === 'all-time') {
      displayedViews = entry.total_views;

      if (includeCoverage) {
        displayedViews += entry.coverage_views;
      }

      if (includeMentions) {
        displayedViews += entry.mention_views;
      }

      if (includeOtherSites) {
        displayedViews += entry.manual_other;
      }
    } else {
      let oldViews = 0;
      let newViews = entry.total_views;

      if (currentTimely === 'daily') {
        oldViews = entry.total_views - entry.daily_views;
        displayedViews = entry.daily_views;
      } else if (currentTimely === 'weekly') {
        oldViews = entry.total_views - entry.weekly_views;
        displayedViews = entry.weekly_views;
      } else if (currentTimely === 'monthly') {
        oldViews = entry.total_views - entry.monthly_views;
        displayedViews = entry.monthly_views;
      }

      if (Percentage) {
        if (oldViews > 0) {
          let averageViews = (newViews + oldViews) / 2;
          displayedViews = ((newViews - oldViews) / oldViews) * 100;
/*           const percentageChange = (newViews - oldViews) / oldViews;
          const scaleFactor = entry.total_views / 1014339;
          const normalizedPercentageChange = percentageChange * scaleFactor;
          displayedViews = normalizedPercentageChange * 100; */
        } else {
          displayedViews = 0; // Avoid division by zero
        }
      }
    }

    return displayedViews;
  }

  // Fetch leaderboard data initially when the component is mounted
  onMount(fetchLeaderboard);

  // Subscribe to changes in checkboxes and fetch leaderboard data accordingly
  $: {
    fetchLeaderboard();
  }

  // Subscribe to changes in checkboxes and fetch leaderboard data accordingly
  let unsubscribeLostwave: () => void;
  let unsubscribeCoverage: () => void;
  let unsubscribeMentions: () => void;
  let unsubscribeOtherSites: () => void;
  let unsubscribeFound: () => void;
  let unsubscribeLost: () => void;
  let unsubscribeHidden: () => void;
  let unsubscribeHoaxes: () => void;
  let unsubscribeCurrentTimely: () => void;
  let unsubscribePercentage: () => void;

  $: {
    unsubscribeLostwave = includeLostwave.subscribe(fetchLeaderboard);
    unsubscribeCoverage = includeCoverage.subscribe(fetchLeaderboard);
    unsubscribeMentions = includeMentions.subscribe(fetchLeaderboard);
    unsubscribeOtherSites = includeOtherSites.subscribe(fetchLeaderboard);
    unsubscribeFound = includeFound.subscribe(fetchLeaderboard);
    unsubscribeLost = includeLost.subscribe(fetchLeaderboard);
    unsubscribeHidden = includeHidden.subscribe(fetchLeaderboard);
    unsubscribeHoaxes = excludeHoaxes.subscribe(fetchLeaderboard);
    unsubscribeCurrentTimely = currentTimely.subscribe(fetchLeaderboard);
    unsubscribePercentage = Percentage.subscribe(fetchLeaderboard)
  }

  // Cleanup function
  onDestroy(() => {
    unsubscribeLostwave();
    unsubscribeCoverage();
    unsubscribeMentions();
    unsubscribeOtherSites();
    unsubscribeFound();
    unsubscribeLost();
    unsubscribeHidden();
    unsubscribeHoaxes();
    unsubscribeCurrentTimely();
    unsubscribePercentage();
  });

  const highlights = derived(leaderboard, ($leaderboard) => {
    return $leaderboard.filter(entry => entry.choice !== 'NOT');
  });

  let dropdownOpen = false;

  function toggleDropdown() {
    dropdownOpen = !dropdownOpen;
  }

  function stopPropagation(event) {
    event.stopPropagation();
  }

  function handleDropdownKeyDown(event) {
    if (event.key === "Enter" || event.key === " ") {
      toggleDropdown();
    }
  }

  function handleCheckboxKeyDown(event) {
    if (event.key === "Enter" || event.key === " ") {
      event.target.click();
    }
  }

  async function handleRadioChange(event) {
    const newValue = event.target.value;
    console.log('New value of currentTimely:', newValue);
    currentTimely.set(newValue);
  }

  let randomYoutubeLink = '';

  const openRandomLink = () => {
    const entries = get(leaderboard);
    if (entries.length > 0) {
      const randomEntry = entries[Math.floor(Math.random() * entries.length)];
      if (randomEntry.main_youtube_link) {
        randomYoutubeLink = randomEntry.main_youtube_link;
        window.open(randomYoutubeLink, '_blank');
      }
    }
  };

  const openRandomLinkWithChoice = () => {
    const entries = get(leaderboard);
    const filteredEntries = entries.filter(entry => entry.choice !== 'NOT');
    if (filteredEntries.length > 0) {
      const randomEntry = filteredEntries[Math.floor(Math.random() * filteredEntries.length)];
      if (randomEntry.main_youtube_link) {
        randomYoutubeLink = randomEntry.main_youtube_link;
        window.open(randomYoutubeLink, '_blank');
      }
    }
  };

  let percentageCheckbox: HTMLInputElement | null = null;
  $: if ($currentTimely === 'all-time') {
    Percentage.set(false);
    if (percentageCheckbox) {
      percentageCheckbox.disabled = true;
    }
  } else {
    if (percentageCheckbox) {
      percentageCheckbox.disabled = false;
    }
  }
</script>

<main>
  <!-- <div class="mobile-message">
    For a better experience, switch to a desktop mode.
  </div> -->
  <section class="buttons-section">
    <h1>Lostwave Charts</h1>
    <div class="container">
      <div class="dd-container">
        <div class="dropdown" on:click={toggleDropdown}>
          <button class="dropbtn">Options</button>
          <div class="dropdown-content" style="{dropdownOpen ? 'display: block;' : 'display: none;'}" on:click|stopPropagation>
            <label class:selected={$includeLostwave ? 'selected' : ''}> <input type="checkbox" bind:checked={$includeLostwave} on:keydown={handleCheckboxKeyDown}> Only on Lostwave </label>
            <label class:selected={$includeCoverage ? 'selected' : ''}> <input type="checkbox" bind:checked={$includeCoverage} on:keydown={handleCheckboxKeyDown}> Include Coverage </label>
            <label class:selected={$includeMentions ? 'selected' : ''}> <input type="checkbox" bind:checked={$includeMentions} on:keydown={handleCheckboxKeyDown}> Include Mentions </label>
            <label class:selected={$includeOtherSites ? 'selected' : ''}> <input type="checkbox" bind:checked={$includeOtherSites} on:keydown={handleCheckboxKeyDown}> Include Other Sites </label>
            <label class:selected={$includeFound ? 'selected' : ''}> <input type="checkbox" bind:checked={$includeFound} on:keydown={handleCheckboxKeyDown}> Found </label>
            <label class:selected={$includeLost ? 'selected' : ''}> <input type="checkbox" bind:checked={$includeLost} on:keydown={handleCheckboxKeyDown}> Lost </label>
            <!-- <label class:selected={$includeHidden ? 'selected' : ''}> <input type="checkbox" bind:checked={$includeHidden} on:keydown={handleCheckboxKeyDown}> Hidden </label> -->
            <label class:selected={$excludeHoaxes ? 'selected' : ''}> <input type="checkbox" bind:checked={$excludeHoaxes} on:keydown={handleCheckboxKeyDown}> Exclude Hoaxes </label>
            <label class:selected={$Percentage ? 'selected' : ''}>
              <input type="checkbox" bind:this={percentageCheckbox} bind:checked={$Percentage} on:keydown={handleCheckboxKeyDown} disabled={$currentTimely === 'all-time'}> Percentage View
            </label>
          </div>
        </div>
      </div>
      <div class="wrapper">
        {#each timely as timelies}
          <div class="option">
            <input class="input" type="radio" name="btn" value={timelies} bind:group={$currentTimely} on:change={handleRadioChange}>
            <div class="btn">
              <span class="span">{timelies}</span>
            </div>
          </div>
        {/each}
      </div>
      <div class="rl-container">
        <button class="rlbtn" on:click={openRandomLink}>Random Song</button>
        <button class="rlbtn" on:click={openRandomLinkWithChoice}>Random Highlight</button>
      </div>
      <!--
        HERE LIES THE HIGHLIGHTS PIN BOARD. GONE BUT NEVER FORGOTTEN.
      <div class="highlights">
        {#each $highlights as entry}
          <div class="highlights-square">
            <a href={entry.main_youtube_link} target="_blank">
              <img src={entry.thumbnail_link} alt={entry.name} />
            </a>
            <div class="highlights-details">
              #{entry.rank} - {entry.name}
            </div>
          </div>
        {/each}
      </div>
      -->
    </section>
    <section class="leaderboard-section">
      {#each $leaderboard as entry}
        <div class="card" style="background-color: {entry.cardColor}">
          <div class="rank">#{entry.rank}</div>
          <div
            class="thumbnail"
            role="button"
            aria-label="Open YouTube Link"
            on:click={() => window.open(entry.main_youtube_link, '_blank')}
            tabindex="0"
          >
            <img src="{entry.thumbnail_link}" alt="Thumbnail" />
          </div>
          <div class="entry-details">
            <p class="name">{entry.name}</p>
            <div class="description-box">
              <p class="description">{entry.description}</p>
            </div>
            <p class="displayed-views">
              {#if $Percentage}
                {entry.displayedViews.toFixed(2)}%
              {:else}
                Views: {entry.displayedViews.toLocaleString()}
              {/if}
            </p>
          </div>
          <!--
          {#if entry.choice !== 'NOT'}
          <img class="stamp-icon" src="./stamp.png" alt="Stamp Icon" />
          {/if}
          -->
          {#if entry.choice == 'NEW'}
          <img class="stamp-icon" src="./New.png" alt="New Icon" />
          {/if}
        </div>
      {/each}
    </section>
</main>
