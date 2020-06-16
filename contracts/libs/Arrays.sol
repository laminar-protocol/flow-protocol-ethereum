// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6.10;

library Arrays {
    /// Find median of an unsorted uint array. Median: item at index `length/2`(floor) of sorted array.
    /// Note that items in the input array might be swapped.
    function findMedian(uint256[] memory unsorted) internal pure returns (uint256) {
        require(unsorted.length > 0, "empty array has no median");

        uint256 medianIndex = unsorted.length / 2;
        return Quick.select(unsorted, medianIndex);
    }
}

/// Quick select/sort.
library Quick {
    /// Select kth smallest item, where k starts from 0.
    function select(uint256[] memory arr, uint256 k) internal pure returns (uint256) {
        require((0 <= k) && (k < arr.length), "k out of bound");

        uint256 low = 0;
        uint256 high = arr.length - 1;
        while (high > low) {
            uint256 i = partition(arr, low, high);
            if (i > k) high = i - 1;
            else if (i < k) low = i + 1;
            else return arr[i];
        }
        return arr[low];
    }

    /// Partition the subarray a[low..high] so that a[low..j-1] <= a[j] <= a[j+1..high] and return j.
    function partition(
        uint256[] memory arr,
        uint256 low,
        uint256 high
    ) internal pure returns (uint256) {
        uint256 i = low;
        uint256 j = high + 1;
        uint256 v = arr[low];

        while (true) {
            // find item on low to swap
            while (arr[++i] < v) {
                if (i == high) break;
            }
            // find item on high to swap
            while (v < arr[--j]) {
                if (j == low) break;
            }

            // check if pointer cross
            if (i >= j) break;

            (arr[i], arr[j]) = (arr[j], arr[i]);
        }

        // put partitioning item v at arr[j]
        (arr[low], arr[j]) = (arr[j], arr[low]);

        return j;
    }
}
