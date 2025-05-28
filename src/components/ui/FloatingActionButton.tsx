"use client";

import {
  Box,
  IconButton,
  Tooltip,
  VStack,
  HStack,
  Text,
  useDisclosure,
  Collapse,
  Portal,
  useColorModeValue,
  Flex,
} from "@chakra-ui/react";
import {
  FaPlus,
  FaDownload,
  FaUpload,
  FaExpand,
  FaCompress,
  FaCog,
  FaQuestionCircle,
  FaKeyboard,
  FaSync,
} from "react-icons/fa";
import { useState } from "react";

// Floating animations using CSS classes
const floatAnimation = "float 2s ease-in-out infinite";
const pulseAnimation = "pulse 2s ease-in-out infinite";
const rippleAnimation = "ripple 0.6s ease-out";

interface FABAction {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  color?: string;
  isDisabled?: boolean;
}

interface FloatingActionButtonProps {
  actions?: FABAction[];
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  size?: 'sm' | 'md' | 'lg';
}

export const FloatingActionButton = ({
  actions = [],
  position = 'bottom-right',
  size = 'md'
}: FloatingActionButtonProps) => {
  const { isOpen, onToggle } = useDisclosure();
  const [isHovered, setIsHovered] = useState(false);

  const bgColor = useColorModeValue('white', 'gray.800');
  const shadowColor = useColorModeValue('rgba(0, 0, 0, 0.1)', 'rgba(0, 0, 0, 0.3)');

  const positionStyles = {
    'bottom-right': { bottom: '24px', right: '24px' },
    'bottom-left': { bottom: '24px', left: '24px' },
    'top-right': { top: '24px', right: '24px' },
    'top-left': { top: '24px', left: '24px' },
  };

  const sizeConfig = {
    sm: { size: '40px', iconSize: '16px' },
    md: { size: '56px', iconSize: '20px' },
    lg: { size: '64px', iconSize: '24px' },
  };

  const defaultActions: FABAction[] = [
    {
      icon: FaUpload,
      label: "Upload Dataset",
      onClick: () => console.log("Upload clicked"),
      color: "brand.500",
    },
    {
      icon: FaDownload,
      label: "Export Data",
      onClick: () => console.log("Download clicked"),
      color: "cyber.500",
    },
    {
      icon: FaSync,
      label: "Refresh",
      onClick: () => console.log("Refresh clicked"),
      color: "warning.500",
    },
    {
      icon: FaCog,
      label: "Settings",
      onClick: () => console.log("Settings clicked"),
      color: "gray.500",
    },
  ];

  const allActions = actions.length > 0 ? actions : defaultActions;

  return (
    <Portal>
      <Box
        position="fixed"
        {...positionStyles[position]}
        zIndex={1000}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <VStack spacing={3} align={position.includes('right') ? 'end' : 'start'}>
          {/* Action buttons */}
          <Collapse in={isOpen} animateOpacity>
            <VStack spacing={2} align={position.includes('right') ? 'end' : 'start'}>
              {allActions.map((action, index) => (
                <Tooltip
                  key={index}
                  label={action.label}
                  placement={position.includes('right') ? 'left' : 'right'}
                  hasArrow
                >
                  <Box
                    animation={floatAnimation}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <IconButton
                      aria-label={action.label}
                      icon={<action.icon />}
                      size="md"
                      borderRadius="full"
                      bg={bgColor}
                      color={action.color || 'gray.600'}
                      shadow="floating"
                      border="1px solid"
                      borderColor="gray.200"
                      _hover={{
                        transform: 'scale(1.1)',
                        shadow: 'glowHover',
                        borderColor: action.color || 'brand.300',
                      }}
                      _active={{
                        transform: 'scale(0.95)',
                      }}
                      transition="all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
                      onClick={action.onClick}
                      isDisabled={action.isDisabled}
                    />
                  </Box>
                </Tooltip>
              ))}
            </VStack>
          </Collapse>

          {/* Main FAB button */}
          <Box position="relative">
            <IconButton
              aria-label="Actions menu"
              icon={
                <Box
                  transform={isOpen ? 'rotate(45deg)' : 'rotate(0deg)'}
                  transition="transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
                >
                  <FaPlus />
                </Box>
              }
              size="lg"
              borderRadius="full"
              bg="brand.500"
              color="white"
              shadow="floating"
              w={sizeConfig[size].size}
              h={sizeConfig[size].size}
              fontSize={sizeConfig[size].iconSize}
              _hover={{
                bg: 'brand.600',
                transform: 'scale(1.1)',
                shadow: 'glowHover',
              }}
              _active={{
                transform: 'scale(0.95)',
                bg: 'brand.700',
              }}
              transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
              onClick={onToggle}
              animation={isHovered ? pulseAnimation : undefined}
            />

            {/* Ripple effect */}
            {isOpen && (
              <Box
                position="absolute"
                top="50%"
                left="50%"
                w="100%"
                h="100%"
                borderRadius="full"
                bg="brand.400"
                opacity={0.3}
                transform="translate(-50%, -50%)"
                animation={rippleAnimation}
                pointerEvents="none"
              />
            )}
          </Box>
        </VStack>
      </Box>
    </Portal>
  );
};

// Quick access toolbar
export const QuickAccessToolbar = () => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const quickActions = [
    { icon: FaExpand, label: "Fullscreen", shortcut: "F" },
    { icon: FaSync, label: "Refresh", shortcut: "R" },
    { icon: FaKeyboard, label: "Shortcuts", shortcut: "?" },
    { icon: FaQuestionCircle, label: "Help", shortcut: "H" },
  ];

  return (
    <Portal>
      <Box
        position="fixed"
        top="50%"
        right="24px"
        transform="translateY(-50%)"
        zIndex={999}
      >
        <VStack
          spacing={1}
          bg={bgColor}
          borderRadius="xl"
          border="1px solid"
          borderColor={borderColor}
          shadow="floating"
          p={2}
          backdropFilter="blur(10px)"
        >
          {quickActions.map((action, index) => (
            <Tooltip
              key={index}
              label={
                <Flex align="center" gap={2}>
                  <Text fontSize="sm">{action.label}</Text>
                  <Box
                    px={1.5}
                    py={0.5}
                    bg="gray.700"
                    color="white"
                    borderRadius="sm"
                    fontSize="xs"
                    fontFamily="mono"
                  >
                    {action.shortcut}
                  </Box>
                </Flex>
              }
              placement="left"
              hasArrow
            >
              <IconButton
                aria-label={action.label}
                icon={<action.icon />}
                size="sm"
                variant="ghost"
                borderRadius="lg"
                _hover={{
                  bg: 'brand.50',
                  color: 'brand.600',
                  transform: 'scale(1.05)',
                }}
                transition="all 0.2s"
              />
            </Tooltip>
          ))}
        </VStack>
      </Box>
    </Portal>
  );
};

export default FloatingActionButton;
