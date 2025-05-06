"use client";

import React, { useState, useCallback } from 'react';
import { Box, Button, Input, FormControl, FormLabel, useToast, VStack, Text, Link, HStack } from '@chakra-ui/react';
import { FiDownload, FiHelpCircle } from 'react-icons/fi';

const DatasetUploader: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.type === 'application/json') {
        setSelectedFile(file);
      } else {
        toast({
          title: "Invalid File Type",
          description: "Please select a JSON file (.json).",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        setSelectedFile(null);
        event.target.value = ''; // Clear the input
      }
    }
  };

  const handleUpload = useCallback(async () => {
    if (!selectedFile) {
      toast({
        title: "No File Selected",
        description: "Please select a JSON file to upload.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const content = e.target?.result;
        if (typeof content !== 'string') {
          throw new Error('Failed to read file content.');
        }
        const jsonData = JSON.parse(content);

        // Send data to the backend API
        const response = await fetch('/api/upload-dataset', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(jsonData),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to upload dataset');
        }

        toast({
          title: "Upload Successful",
          description: "Dataset has been uploaded and processed.",
          status: "success",
          duration: 5000,
          isClosable: true,
        });
        setSelectedFile(null); // Clear selection after successful upload
        // Optionally trigger a refresh of graph data here

      } catch (error: any) {
        console.error("Upload error:", error);
        toast({
          title: "Upload Failed",
          description: error.message || "An unexpected error occurred.",
          status: "error",
          duration: 9000,
          isClosable: true,
        });
      } finally {
        setIsLoading(false);
      }
    };

    reader.onerror = () => {
      toast({
        title: "File Read Error",
        description: "Could not read the selected file.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      setIsLoading(false);
    };

    reader.readAsText(selectedFile);
  }, [selectedFile, toast]);

  return (
    <Box p={4} borderWidth="1px" borderRadius="lg">
      <VStack spacing={4} align="stretch">
        <FormControl>
          <FormLabel htmlFor="json-upload">Upload Dataset (JSON)</FormLabel>
          <Input
            id="json-upload"
            type="file"
            accept=".json"
            onChange={handleFileChange}
            p={1} // Adjust padding for better appearance
          />
        </FormControl>
        {selectedFile && (
          <Text fontSize="sm">Selected file: {selectedFile.name}</Text>
        )}
        <Button
          colorScheme="blue"
          onClick={handleUpload}
          isLoading={isLoading}
          isDisabled={!selectedFile || isLoading}
        >
          Upload to Neo4j
        </Button>

        <HStack spacing={4} mt={2} justify="center">
          <Link href="/dataset-upload-guide.md" target="_blank" display="inline-flex" alignItems="center">
            <FiHelpCircle style={{ marginRight: '5px' }} />
            Upload Guide
          </Link>
          <Link href="/sample-dataset.json" download display="inline-flex" alignItems="center">
            <FiDownload style={{ marginRight: '5px' }} />
            Sample Dataset
          </Link>
        </HStack>
      </VStack>
    </Box>
  );
};

export default DatasetUploader;
